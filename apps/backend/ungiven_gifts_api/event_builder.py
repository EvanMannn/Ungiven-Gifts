"""Turns an organizer's EventCreate payload into a fully shuffled EventRecord."""

import random

from . import pairing
from .models import EventCreate, EventPublic, EventRecord, ParticipantRecord
from .security import hash_admin_key, new_admin_key, new_participant_id


class EventValidationError(ValueError):
    pass


def build_event(payload: EventCreate, slug: str, rng: random.Random) -> tuple[EventRecord, str]:
    """Validate the payload, run the draw, and return (event, plaintext admin key)."""
    names = [p.name for p in payload.participants]
    id_by_name = _unique_ids(names)

    # Exclusions -> unordered pairs of ids.
    forbidden: set[frozenset[str]] = set()
    for a, b in payload.exclusions:
        missing = [n for n in (a, b) if n.casefold() not in id_by_name]
        if missing:
            raise EventValidationError(f"Exclusion names unknown participant(s): {missing}")
        forbidden.add(frozenset((id_by_name[a.casefold()], id_by_name[b.casefold()])))

    ids = [id_by_name[n.casefold()] for n in names]
    group_of = _assign_groups(payload, ids, rng)

    question_set = set(payload.questions)
    for p in payload.participants:
        unknown = set(p.answers) - question_set
        if unknown:
            raise EventValidationError(
                f"{p.name} has answers to questions that aren't on the questionnaire: "
                f"{sorted(unknown)}"
            )

    def is_allowed(giver: str, recipient: str) -> bool:
        if frozenset((giver, recipient)) in forbidden:
            return False
        return group_of is None or group_of[giver] != group_of[recipient]

    try:
        name_of = {pid: p.name for pid, p in zip(ids, payload.participants, strict=True)}
        recipients = pairing.assign_recipients(ids, is_allowed, rng, name_of.__getitem__)
    except pairing.PairingError as exc:
        raise EventValidationError(str(exc)) from exc

    restrictions = list(dict.fromkeys(payload.restrictions))  # dedupe, keep order
    options = pairing.assign_restriction_options(
        ids, restrictions, payload.restriction_choices, rng
    )

    participants = [
        ParticipantRecord(
            id=pid,
            name=p.name,
            group=group_of[pid] if group_of else None,
            answers={q: a for q, a in p.answers.items() if a},
            recipient_id=recipients[pid],
            restriction_options=options[pid],
        )
        for pid, p in zip(ids, payload.participants, strict=True)
    ]

    admin_key = new_admin_key()
    event = EventRecord(
        slug=slug,
        name=payload.name,
        format=payload.format,
        description=payload.description,
        budget=payload.budget,
        exchange_date=payload.exchange_date,
        admin_key_hash=hash_admin_key(admin_key),
        questions=payload.questions,
        restrictions=restrictions,
        group_size=payload.group_size,
        exclusions=payload.exclusions,
        participants=participants,
    )
    return event, admin_key


def _unique_ids(names: list[str]) -> dict[str, str]:
    id_by_name: dict[str, str] = {}
    for name in names:
        key = name.casefold()
        if key in id_by_name:
            raise EventValidationError(f"Participant names must be unique; {name!r} repeats.")
        id_by_name[key] = new_participant_id()
    return id_by_name


def _assign_groups(
    payload: EventCreate, ids: list[str], rng: random.Random
) -> dict[str, str] | None:
    if payload.group_size is None:
        return None
    try:
        return pairing.split_into_groups(ids, payload.group_size, rng)
    except pairing.PairingError as exc:
        raise EventValidationError(str(exc)) from exc


def to_public(event: EventRecord) -> EventPublic:
    return EventPublic(
        slug=event.slug,
        name=event.name,
        format=event.format,
        description=event.description,
        budget=event.budget,
        exchange_date=event.exchange_date,
        has_questionnaire=bool(event.questions),
        has_restrictions=bool(event.restrictions),
        groups_enabled=event.group_size is not None,
    )
