import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings
from .models import EventRecord, ParticipantRecord
from .repository import EventRepository, get_repository
from .security import hash_admin_key, read_token

Repo = Annotated[EventRepository, Depends(get_repository)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_event(slug: str, repo: Repo) -> EventRecord:
    event = await repo.get(slug)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found.")
    return event


EventDep = Annotated[EventRecord, Depends(get_event)]


async def get_participant(
    event: EventDep,
    settings: SettingsDep,
    authorization: Annotated[str | None, Header()] = None,
) -> ParticipantRecord:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized
    claims = read_token(
        authorization.removeprefix("Bearer "),
        settings.secret_key,
        settings.session_ttl_days * 86_400,
    )
    if claims is None:
        raise unauthorized
    slug, participant_id, version = claims
    participant = event.participant(participant_id)
    if (
        slug != event.slug
        or participant is None
        or participant.password_hash is None
        or participant.password_version != version
    ):
        raise unauthorized
    return participant


ParticipantDep = Annotated[ParticipantRecord, Depends(get_participant)]


async def require_admin(
    event: EventDep, x_admin_key: Annotated[str | None, Header()] = None
) -> EventRecord:
    if not x_admin_key or not hmac.compare_digest(
        hash_admin_key(x_admin_key), event.admin_key_hash
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid admin key.")
    return event


AdminEventDep = Annotated[EventRecord, Depends(require_admin)]
