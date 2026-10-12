import random

from fastapi import APIRouter, HTTPException, status

from ..deps import EventDep, Repo, SettingsDep
from ..event_builder import EventValidationError, build_event, to_public
from ..models import EventCreate, EventCreated, EventPublic
from ..security import ADMIN_SUBJECT, hash_password, issue_token, new_slug

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, repo: Repo, settings: SettingsDep) -> EventCreated:
    slug = new_slug()
    while await repo.slug_exists(slug):
        slug = new_slug()

    try:
        event = build_event(payload, slug, random.SystemRandom())
    except EventValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    created = EventCreated(
        slug=slug, admin_token=issue_token(slug, ADMIN_SUBJECT, 0, settings.secret_key)
    )
    if payload.organizer:
        organizer = next(
            (
                p
                for p in event.participants
                if p.name.casefold() == payload.organizer.name.casefold()
            ),
            None,
        )
        if organizer is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "The organizer must also be in the participant list to take part.",
            )
        organizer.password_hash = hash_password(payload.organizer.password)
        created.organizer_participant_id = organizer.id
        created.organizer_token = issue_token(
            slug, organizer.id, organizer.password_version, settings.secret_key
        )

    await repo.insert(event)
    return created


@router.get("/{slug}")
async def get_event(event: EventDep) -> EventPublic:
    return to_public(event)
