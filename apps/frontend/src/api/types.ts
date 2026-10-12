// Mirrors apps/backend/ungiven_gifts_api/models.py. Keep the two in sync.

/** A deckbuilding restriction. Titles are unique within an event; a choice is saved by title. */
export interface Restriction {
  title: string
  description: string
}

export interface ParticipantIn {
  name: string
  answers?: Record<string, string>
}

export interface EventCreate {
  name: string
  format: string
  description?: string
  budget?: string | null
  exchange_date?: string | null
  participants: ParticipantIn[]
  questions?: string[]
  restrictions?: Restriction[]
  restriction_choices?: number
  exclusions?: [string, string][]
  /** People per build group, or null for no groups. Must split everyone evenly. */
  group_size?: number | null
  /** The organizer's admin page password. Can't be reset. */
  admin_password: string
  organizer?: { name: string; password: string } | null
}

export interface EventCreated {
  slug: string
  /** Logs the creator in as admin straight away. */
  admin_token: string
  organizer_participant_id: string | null
  organizer_token: string | null
}

export interface EventPublic {
  slug: string
  name: string
  format: string
  description: string
  budget: string | null
  exchange_date: string | null
  has_questionnaire: boolean
  has_restrictions: boolean
  groups_enabled: boolean
}

/** A typed name matched to a participant. `claimed` means they've already set a password. */
export interface ParticipantMatch {
  participant_id: string
  name: string
  claimed: boolean
}

export interface AdminLoginResponse {
  token: string
}

export interface LoginResponse {
  token: string
  participant_id: string
  first_login: boolean
}

export interface QuestionAnswer {
  question: string
  answer: string
}

export interface Dashboard {
  event: EventPublic
  participant_id: string
  name: string
  recipient: { name: string; answers: QuestionAnswer[] }
  restriction_options: Restriction[]
  /** Title of the chosen option. */
  chosen_restriction: string | null
  group_mates: string[] | null
  onboarded: boolean
}

export interface AdminParticipant {
  id: string
  name: string
  group: string | null
  claimed: boolean
  onboarded: boolean
  chose_restriction: boolean
}

export interface AdminView {
  event: EventPublic
  questions: string[]
  restrictions: Restriction[]
  participants: AdminParticipant[]
}

export interface EventUpdate {
  name?: string
  format?: string
  description?: string
  budget?: string | null
  exchange_date?: string | null
}
