from fastapi import APIRouter, HTTPException, status

from ..deps import EventDep, ParticipantDep, Repo, SettingsDep
from ..event_builder import to_public
from ..models import (
    ChooseRestriction,
    Dashboard,
    EventRecord,
    LoginRequest,
    LoginResponse,
    ParticipantRecord,
    QuestionAnswer,
    RecipientView,
)
from ..security import hash_password, issue_token, verify_password

router = APIRouter(prefix="/events/{slug}", tags=["participants"])


@router.post("/login")
async def login(
    body: LoginRequest, event: EventDep, repo: Repo, settings: SettingsDep
) -> LoginResponse:
    """Log in as a participant. The first login for a name sets that name's password."""
    participant = event.participant(body.participant_id)
    if participant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That participant isn't in this event.")

    first_login = participant.password_hash is None
    if first_login:
        participant.password_hash = hash_password(body.password)
        await repo.save(event)
    elif not verify_password(body.password, participant.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Wrong password. Ask the organizer to reset it if you've forgotten it.",
        )

    token = issue_token(
        event.slug, participant.id, participant.password_version, settings.secret_key
    )
    return LoginResponse(token=token, participant_id=participant.id, first_login=first_login)


@router.get("/me")
async def dashboard(event: EventDep, me: ParticipantDep) -> Dashboard:
    return _dashboard(event, me)


@router.post("/me/restriction")
async def choose_restriction(
    body: ChooseRestriction, event: EventDep, me: ParticipantDep, repo: Repo
) -> Dashboard:
    if body.restriction not in me.restriction_options:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "That restriction isn't one of your options."
        )
    me.chosen_restriction = body.restriction
    await repo.save(event)
    return _dashboard(event, me)


@router.post("/me/onboarded")
async def finish_onboarding(event: EventDep, me: ParticipantDep, repo: Repo) -> Dashboard:
    me.onboarded = True
    await repo.save(event)
    return _dashboard(event, me)


def _dashboard(event: EventRecord, me: ParticipantRecord) -> Dashboard:
    recipient = event.participant(me.recipient_id)
    assert recipient is not None
    group_mates = (
        [p.name for p in event.participants if p.group == me.group and p.id != me.id]
        if me.group is not None
        else None
    )
    return Dashboard(
        event=to_public(event),
        participant_id=me.id,
        name=me.name,
        recipient=RecipientView(
            name=recipient.name,
            answers=[
                QuestionAnswer(question=q, answer=recipient.answers[q])
                for q in event.questions
                if q in recipient.answers
            ],
        ),
        restriction_options=me.restriction_options,
        chosen_restriction=me.chosen_restriction,
        group_mates=group_mates,
        onboarded=me.onboarded,
    )
