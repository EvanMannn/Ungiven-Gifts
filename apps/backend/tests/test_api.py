from fastapi.testclient import TestClient


def _create(client: TestClient, payload: dict) -> dict:
    res = client.post("/api/events", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def _find(client: TestClient, slug: str, name: str) -> dict:
    res = client.post(f"/api/events/{slug}/participants/find", json={"name": name})
    assert res.status_code == 200, res.text
    return res.json()


def _login(client: TestClient, slug: str, name: str, password: str = "pw") -> str:
    pid = _find(client, slug, name)["participant_id"]
    res = client.post(
        f"/api/events/{slug}/login", json={"participant_id": pid, "password": password}
    )
    assert res.status_code == 200, res.text
    return res.json()["token"]


def _admin_login(client: TestClient, slug: str, password: str = "admin-pw") -> str:
    res = client.post(f"/api/events/{slug}/admin/login", json={"password": password})
    assert res.status_code == 200, res.text
    return res.json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_full_participant_flow(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]

    public = client.get(f"/api/events/{slug}").json()
    assert public["has_questionnaire"] and public["has_restrictions"]
    assert not public["groups_enabled"]
    assert "participants" not in public

    recipients = set()
    for name in ("Alice", "Bob", "Cara", "Dan"):
        me = client.get(f"/api/events/{slug}/me", headers=_auth(_login(client, slug, name))).json()
        assert me["recipient"]["name"] != name
        assert len(me["restriction_options"]) == 2
        assert me["onboarded"] is False
        recipients.add(me["recipient"]["name"])
    assert recipients == {"Alice", "Bob", "Cara", "Dan"}


def test_recipient_answers_follow_question_order(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    for name in ("Bob", "Cara", "Dan"):
        me = client.get(f"/api/events/{slug}/me", headers=_auth(_login(client, slug, name))).json()
        if me["recipient"]["name"] == "Alice":
            assert me["recipient"]["answers"] == [
                {"question": "Favorite colors?", "answer": "Golgari"},
                {"question": "Pet cards?", "answer": "Mulldrifter"},
            ]
            return
    raise AssertionError("Nobody drew Alice")


def test_first_login_sets_password(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    assert _find(client, slug, "Alice")["claimed"] is False
    _login(client, slug, "Alice", "secret")
    alice = _find(client, slug, "Alice")
    assert alice["claimed"] is True

    bad = client.post(
        f"/api/events/{slug}/login",
        json={"participant_id": alice["participant_id"], "password": "nope"},
    )
    assert bad.status_code == 401
    _login(client, slug, "Alice", "secret")


def test_find_participant_by_name(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    match = _find(client, slug, "  aLiCe ")
    assert match["name"] == "Alice"

    missing = client.post(f"/api/events/{slug}/participants/find", json={"name": "Alicia"})
    assert missing.status_code == 404
    assert "exactly" in missing.json()["detail"]


def test_restriction_descriptions_reach_the_builder(
    client: TestClient, event_payload: dict
) -> None:
    event_payload["restrictions"] = [{"title": "Mono-colored", "description": "One color only."}]
    slug = _create(client, event_payload)["slug"]
    me = client.get(f"/api/events/{slug}/me", headers=_auth(_login(client, slug, "Bob"))).json()
    assert me["restriction_options"] == [
        {"title": "Mono-colored", "description": "One color only."}
    ]


def test_duplicate_restriction_titles_rejected(client: TestClient, event_payload: dict) -> None:
    event_payload["restrictions"] = [{"title": "Tribal"}, {"title": "tribal", "description": "x"}]
    res = client.post("/api/events", json=event_payload)
    assert res.status_code == 422
    assert "unique" in res.json()["detail"]


def test_choose_restriction_and_onboard(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    headers = _auth(_login(client, slug, "Bob"))
    me = client.get(f"/api/events/{slug}/me", headers=headers).json()

    bad = client.post(
        f"/api/events/{slug}/me/restriction", headers=headers, json={"restriction": "Made up"}
    )
    assert bad.status_code == 422

    pick = me["restriction_options"][1]
    assert set(pick) == {"title", "description"}
    res = client.post(
        f"/api/events/{slug}/me/restriction", headers=headers, json={"restriction": pick["title"]}
    )
    assert res.json()["chosen_restriction"] == pick["title"]

    done = client.post(f"/api/events/{slug}/me/onboarded", headers=headers).json()
    assert done["onboarded"] is True


def test_me_requires_token(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    assert client.get(f"/api/events/{slug}/me").status_code == 401
    assert client.get(f"/api/events/{slug}/me", headers=_auth("garbage")).status_code == 401


def test_token_is_scoped_to_its_event(client: TestClient, event_payload: dict) -> None:
    first = _create(client, event_payload)["slug"]
    second = _create(client, event_payload)["slug"]
    token = _login(client, first, "Alice")
    assert client.get(f"/api/events/{second}/me", headers=_auth(token)).status_code == 401


def test_groups_give_safe_contacts(client: TestClient, event_payload: dict) -> None:
    event_payload["group_size"] = 2
    slug = _create(client, event_payload)["slug"]

    me = client.get(f"/api/events/{slug}/me", headers=_auth(_login(client, slug, "Cara"))).json()
    assert len(me["group_mates"]) == 1
    assert me["recipient"]["name"] not in me["group_mates"]


def test_uneven_group_size_rejected(client: TestClient, event_payload: dict) -> None:
    # 4 people can't be split into groups of 3.
    event_payload["group_size"] = 3
    res = client.post("/api/events", json=event_payload)
    assert res.status_code == 422
    assert "evenly" in res.json()["detail"]


def test_exclusions_are_honored(client: TestClient, event_payload: dict) -> None:
    # Alice can't be paired with Bob or Cara either way, so Alice <-> Dan is forced.
    event_payload["exclusions"] = [["Alice", "Bob"], ["Cara", "Alice"]]
    slug = _create(client, event_payload)["slug"]
    me = client.get(f"/api/events/{slug}/me", headers=_auth(_login(client, slug, "Alice"))).json()
    assert me["recipient"]["name"] == "Dan"


def test_impossible_event_rejected(client: TestClient, event_payload: dict) -> None:
    event_payload["exclusions"] = [["Alice", "Bob"], ["Alice", "Cara"], ["Alice", "Dan"]]
    res = client.post("/api/events", json=event_payload)
    assert res.status_code == 422
    assert "Alice" in res.json()["detail"]


def test_validation_errors(client: TestClient, event_payload: dict) -> None:
    dupes = {**event_payload, "participants": [{"name": "Al"}, {"name": "al"}]}
    assert client.post("/api/events", json=dupes).status_code == 422

    unknown = {**event_payload, "exclusions": [["Alice", "Zed"]]}
    assert client.post("/api/events", json=unknown).status_code == 422

    stray = {
        **event_payload,
        "participants": [{"name": "A", "answers": {"Nope?": "x"}}, {"name": "B"}],
    }
    assert client.post("/api/events", json=stray).status_code == 422


def test_question_length_limit(client: TestClient, event_payload: dict) -> None:
    long_question = {
        **event_payload,
        "questions": ["?" * 1000],
        "participants": [{"name": "A"}, {"name": "B"}],
    }
    assert client.post("/api/events", json=long_question).status_code == 201

    too_long = {**long_question, "questions": ["?" * 1001]}
    assert client.post("/api/events", json=too_long).status_code == 422


def test_organizer_is_logged_in_on_create(client: TestClient, event_payload: dict) -> None:
    event_payload["organizer"] = {"name": "dan", "password": "hunter2"}
    created = _create(client, event_payload)
    me = client.get(f"/api/events/{created['slug']}/me", headers=_auth(created["organizer_token"]))
    assert me.status_code == 200
    assert me.json()["name"] == "Dan"


def test_organizer_must_be_participant(client: TestClient, event_payload: dict) -> None:
    event_payload["organizer"] = {"name": "Zed", "password": "x"}
    assert client.post("/api/events", json=event_payload).status_code == 422


def test_admin_password_is_required(client: TestClient, event_payload: dict) -> None:
    del event_payload["admin_password"]
    assert client.post("/api/events", json=event_payload).status_code == 422


def test_creator_gets_an_admin_token(client: TestClient, event_payload: dict) -> None:
    created = _create(client, event_payload)
    res = client.get(f"/api/events/{created['slug']}/admin", headers=_auth(created["admin_token"]))
    assert res.status_code == 200


def test_admin_login(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    wrong = client.post(f"/api/events/{slug}/admin/login", json={"password": "nope"})
    assert wrong.status_code == 401

    token = _admin_login(client, slug)
    assert client.get(f"/api/events/{slug}/admin", headers=_auth(token)).status_code == 200
    assert client.get(f"/api/events/{slug}/admin").status_code == 401


def test_admin_and_participant_tokens_stay_separate(
    client: TestClient, event_payload: dict
) -> None:
    slug = _create(client, event_payload)["slug"]
    participant = _auth(_login(client, slug, "Alice"))
    admin = _auth(_admin_login(client, slug))

    assert client.get(f"/api/events/{slug}/admin", headers=participant).status_code == 401
    assert client.get(f"/api/events/{slug}/me", headers=admin).status_code == 401


def test_admin_token_is_scoped_to_its_event(client: TestClient, event_payload: dict) -> None:
    first = _create(client, event_payload)
    second = _create(client, event_payload)["slug"]
    res = client.get(f"/api/events/{second}/admin", headers=_auth(first["admin_token"]))
    assert res.status_code == 401


def test_admin_edit_and_password_reset(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    admin = _auth(_admin_login(client, slug))

    updated = client.patch(
        f"/api/events/{slug}/admin", headers=admin, json={"name": "Renamed", "budget": None}
    )
    assert updated.json()["event"]["name"] == "Renamed"
    assert updated.json()["event"]["budget"] is None

    token = _login(client, slug, "Bob", "old")
    bob = next(p for p in updated.json()["participants"] if p["name"] == "Bob")
    client.post(f"/api/events/{slug}/admin/participants/{bob['id']}/reset-password", headers=admin)

    # Old session is invalidated and the next login sets a fresh password.
    assert client.get(f"/api/events/{slug}/me", headers=_auth(token)).status_code == 401
    _login(client, slug, "Bob", "new")
