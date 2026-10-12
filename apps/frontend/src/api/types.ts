// Mirrors apps/backend/ungiven_gifts_api/models.py. Keep the two in sync.

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
  restrictions?: string[]
  restriction_choices?: number
  exclusions?: [string, string][]
  /** People per build group, or null for no groups. Must split everyone evenly. */
  group_size?: number | null
  organizer?: { name: string; password: string } | null
}

export interface EventCreated {
  slug: string
  admin_key: string
  organizer_participant_id: string | null
  organizer_token: string | null
}

export interface ParticipantSummary {
  id: string
  name: string
  claimed: boolean
}

export interface EventPublic {
  slug: string
  name: string
  format: string
  description: string
  budget: string | null
  exchange_date: string | null
  participants: ParticipantSummary[]
  has_questionnaire: boolean
  has_restrictions: boolean
  groups_enabled: boolean
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
  restriction_options: string[]
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
  restrictions: string[]
  participants: AdminParticipant[]
}

export interface EventUpdate {
  name?: string
  format?: string
  description?: string
  budget?: string | null
  exchange_date?: string | null
}
