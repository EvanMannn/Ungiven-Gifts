import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import type { Dashboard } from '@/api/types'
import { cn } from '@/lib/utils'

/** The builder's restriction options as selectable cards. Picking one saves it right away. */
export function RestrictionPicker({
  slug,
  token,
  dashboard,
  onChange,
}: {
  slug: string
  token: string
  dashboard: Dashboard
  onChange: (d: Dashboard) => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  async function choose(option: string) {
    if (option === dashboard.chosen_restriction) return
    setSaving(option)
    try {
      onChange(await api.chooseRestriction(slug, token, option))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your choice.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className={cn('grid gap-3', dashboard.restriction_options.length > 1 && 'sm:grid-cols-2')} role="radiogroup" aria-label="Restriction">
      {dashboard.restriction_options.map((option) => {
        const chosen = option === dashboard.chosen_restriction
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={saving !== null}
            onClick={() => choose(option)}
            className={cn(
              'relative flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 p-5 text-center font-bold text-balance transition-colors hover:border-gold/60 disabled:cursor-wait',
              chosen ? 'border-gold bg-pine-deep/60 text-gold' : 'border-border',
            )}
          >
            {option}
            {chosen && <Check className="absolute top-2 right-2 size-4" aria-hidden />}
            {saving === option && <Loader2 className="absolute top-2 right-2 size-4 animate-spin" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
