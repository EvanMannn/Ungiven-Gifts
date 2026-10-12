from fastapi.testclient import TestClient


def _create(client: TestClient, payload: dict) -> dict:
    res = client.post("/api/events", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def _login(client: TestClient, slug: str, name: str, password: str = "pw") -> str:
    event = client.get(f"/api/events/{slug}").json()
    pid = next(p["id"] for p in event["participants"] if p["name"] == name)
    res = client.post(
        f"/api/events/{slug}/login", json={"participant_id": pid, "password": password}
    )
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
    assert {p["name"] for p in public["participants"]} == {"Alice", "Bob", "Cara", "Dan"}

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
    _login(client, slug, "Alice", "secret")
    event = client.get(f"/api/events/{slug}").json()
    alice = next(p for p in event["participants"] if p["name"] == "Alice")
    assert alice["claimed"]

    bad = client.post(
        f"/api/events/{slug}/login", json={"participant_id": alice["id"], "password": "nope"}
    )
    assert bad.status_code == 401
    _login(client, slug, "Alice", "secret")


def test_choose_restriction_and_onboard(client: TestClient, event_payload: dict) -> None:
    slug = _create(client, event_payload)["slug"]
    headers = _auth(_login(client, slug, "Bob"))
    me = client.get(f"/api/events/{slug}/me", headers=headers).json()

    bad = client.post(
        f"/api/events/{slug}/me/restriction", headers=headers, json={"restriction": "Made up"}
    )
    assert bad.status_code == 422

    pick = me["restriction_options"][1]
    res = client.post(
        f"/api/events/{slug}/me/restriction", headers=headers, json={"restriction": pick}
    )
    assert res.json()["chosen_restriction"] == pick

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


def test_admin_edit_and_password_reset(client: TestClient, event_payload: dict) -> None:
    created = _create(client, event_payload)
    slug, key = created["slug"], created["admin_key"]
    admin = {"X-Admin-Key": key}

    assert client.get(f"/api/events/{slug}/admin").status_code == 403
    assert (
        client.get(f"/api/events/{slug}/admin", headers={"X-Admin-Key": "wrong"}).status_code == 403
    )

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
