"""Pydantic models for API payloads and for the documents stored in MongoDB.

Each event is a single document with its participants embedded. Events are small
(a playgroup, a store's regulars) so this keeps reads to one lookup per request.
"""

from datetime import UTC, date, datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
# Questionnaire prompts copied from a form header can run long.
QuestionText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


# ---------------------------------------------------------------------------
# Event creation
# ---------------------------------------------------------------------------


class ParticipantIn(BaseModel):
    name: Name
    # Questionnaire answers keyed by question text.
    answers: dict[str, LongText] = Field(default_factory=dict)


class OrganizerIn(BaseModel):
    """Set when the organizer is also a participant, so they're logged in on creation."""

    name: Name
    password: Annotated[str, StringConstraints(min_length=1, max_length=200)]


class EventCreate(BaseModel):
    name: Name
    format: Name = "Commander"
    description: LongText = ""
    budget: Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)] | None = None
    exchange_date: date | None = None

    participants: list[ParticipantIn] = Field(min_length=2, max_length=500)
    questions: list[QuestionText] = Field(default_factory=list, max_length=50)

    restrictions: list[ShortText] = Field(default_factory=list, max_length=200)
    restriction_choices: int = Field(default=2, ge=1, le=10)

    # Pairs of participant names that must not be matched in either direction.
    exclusions: list[tuple[Name, Name]] = Field(default_factory=list)

    # People per build group, or None for no groups. Must split everyone evenly; groupmates never
    # gift each other, so they can talk about their decks freely.
    group_size: int | None = Field(default=None, ge=2)

    organizer: OrganizerIn | None = None


class EventCreated(BaseModel):
    slug: str
    admin_key: str
    organizer_participant_id: str | None = None
    organizer_token: str | None = None


# ---------------------------------------------------------------------------
# Stored documents
# ---------------------------------------------------------------------------


class ParticipantRecord(BaseModel):
    id: str
    name: str
    group: str | None = None
    answers: dict[str, str] = Field(default_factory=dict)

    recipient_id: str
    restriction_options: list[str] = Field(default_factory=list)
    chosen_restriction: str | None = None

    password_hash: str | None = None
    # Bumped whenever the password is reset so old session tokens stop working.
    password_version: int = 0
    onboarded: bool = False


class EventRecord(BaseModel):
    slug: str
    name: str
    format: str
    description: str = ""
    budget: str | None = None
    exchange_date: date | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    admin_key_hash: str
    questions: list[str] = Field(default_factory=list)
    restrictions: list[str] = Field(default_factory=list)
    group_size: int | None = None
    exclusions: list[tuple[str, str]] = Field(default_factory=list)
    participants: list[ParticipantRecord]

    def participant(self, participant_id: str) -> ParticipantRecord | None:
        return next((p for p in self.participants if p.id == participant_id), None)


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------


class ParticipantSummary(BaseModel):
    id: str
    name: str
    claimed: bool


class EventPublic(BaseModel):
    slug: str
    name: str
    format: str
    description: str
    budget: str | None
    exchange_date: date | None
    participants: list[ParticipantSummary]
    has_questionnaire: bool
    has_restrictions: bool
    groups_enabled: bool


class LoginRequest(BaseModel):
    participant_id: str
    password: Annotated[str, StringConstraints(min_length=1, max_length=200)]


class LoginResponse(BaseModel):
    token: str
    participant_id: str
    first_login: bool


class QuestionAnswer(BaseModel):
    question: str
    answer: str


class RecipientView(BaseModel):
    name: str
    answers: list[QuestionAnswer]


class Dashboard(BaseModel):
    event: EventPublic
    participant_id: str
    name: str
    recipient: RecipientView
    restriction_options: list[str]
    chosen_restriction: str | None
    # People in the same group: safe to talk deck-building with, since none of them gift each other.
    group_mates: list[str] | None
    onboarded: bool


class ChooseRestriction(BaseModel):
    restriction: str


class AdminParticipant(BaseModel):
    id: str
    name: str
    group: str | None
    claimed: bool
    onboarded: bool
    chose_restriction: bool


class AdminView(BaseModel):
    event: EventPublic
    questions: list[str]
    restrictions: list[str]
    participants: list[AdminParticipant]


class EventUpdate(BaseModel):
    name: Name | None = None
    format: Name | None = None
    description: LongText | None = None
    budget: Annotated[str, StringConstraints(strip_whitespace=True, max_length=60)] | None = None
    exchange_date: date | None = None
