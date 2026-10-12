from fastapi import APIRouter, HTTPException, status

from ..deps import AdminEventDep, EventDep, Repo, SettingsDep
from ..event_builder import to_public
from ..models import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminParticipant,
    AdminView,
    EventRecord,
    EventUpdate,
)
from ..security import ADMIN_SUBJECT, issue_token, verify_password

router = APIRouter(prefix="/events/{slug}/admin", tags=["admin"])


@router.post("/login")
async def admin_login(
    body: AdminLoginRequest, event: EventDep, settings: SettingsDep
) -> AdminLoginResponse:
    if event.admin_password_hash is None or not verify_password(
        body.password, event.admin_password_hash
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong admin password.")
    # The admin password can't be reset, so its version never changes.
    return AdminLoginResponse(token=issue_token(event.slug, ADMIN_SUBJECT, 0, settings.secret_key))


@router.get("")
async def admin_view(event: AdminEventDep) -> AdminView:
    return _admin_view(event)


@router.patch("")
async def update_event(body: EventUpdate, event: AdminEventDep, repo: Repo) -> AdminView:
    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ("name", "format") and value is None:
            continue
        setattr(event, field, value)
    await repo.save(event)
    return _admin_view(event)


@router.post("/participants/{participant_id}/reset-password")
async def reset_password(participant_id: str, event: AdminEventDep, repo: Repo) -> AdminView:
    """Clear a participant's password so their next login sets a new one."""
    participant = event.participant(participant_id)
    if participant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found.")
    participant.password_hash = None
    participant.password_version += 1
    await repo.save(event)
    return _admin_view(event)


def _admin_view(event: EventRecord) -> AdminView:
    # Deliberately leaves out who has whom so an organizer who's also playing isn't spoiled.
    return AdminView(
        event=to_public(event),
        questions=event.questions,
        restrictions=event.restrictions,
        participants=[
            AdminParticipant(
                id=p.id,
                name=p.name,
                group=p.group,
                claimed=p.password_hash is not None,
                onboarded=p.onboarded,
                chose_restriction=p.chosen_restriction is not None,
            )
            for p in event.participants
        ],
    )
