from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .models import EventRecord, ParticipantRecord
from .repository import EventRepository, get_repository
from .security import ADMIN_SUBJECT, read_token

Repo = Annotated[EventRepository, Depends(get_repository)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
AuthorizationHeader = Annotated[str | None, Header()]


async def get_event(slug: str, repo: Repo) -> EventRecord:
    event = await repo.get(slug)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found.")
    return event


EventDep = Annotated[EventRecord, Depends(get_event)]


def _token_subject(
    authorization: str | None, event: EventRecord, settings: Settings
) -> tuple[str, int] | None:
    """Check a `Bearer <token>` header belongs to this event. Returns (subject, version)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    claims = read_token(
        authorization.removeprefix("Bearer "),
        settings.secret_key,
        settings.session_ttl_days * 86_400,
    )
    if claims is None:
        return None
    slug, subject, version = claims
    return (subject, version) if slug == event.slug else None


async def get_participant(
    event: EventDep, settings: SettingsDep, authorization: AuthorizationHeader = None
) -> ParticipantRecord:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
    claims = _token_subject(authorization, event, settings)
    if claims is None:
        raise unauthorized
    participant_id, version = claims
    participant = event.participant(participant_id)
    if (
        participant is None
        or participant.password_hash is None
        or participant.password_version != version
    ):
        raise unauthorized
    return participant


ParticipantDep = Annotated[ParticipantRecord, Depends(get_participant)]


async def require_admin(
    event: EventDep, settings: SettingsDep, authorization: AuthorizationHeader = None
) -> EventRecord:
    claims = _token_subject(authorization, event, settings)
    if claims is None or claims[0] != ADMIN_SUBJECT or event.admin_password_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in as the organizer.")
    return event


AdminEventDep = Annotated[EventRecord, Depends(require_admin)]
