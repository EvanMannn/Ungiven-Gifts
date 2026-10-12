import { MAX_BUDGET, cleanBudgetInput, parseBudget } from '@/lib/format'

/**
 * Dollar amount with a "$" add-on joined to the left of the box. Accepts cents, never a negative
 * number, and ignores keystrokes that would take it over MAX_BUDGET.
 */
export function BudgetInput({ id, value, onChange }: { id: string; value: string; onChange: (amount: string) => void }) {
  return (
    // The wrapper draws the border and focus ring, so the "$" and the box read as one control.
    <div className="flex h-9 w-full overflow-hidden rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
      <span className="flex items-center border-r border-input bg-muted/60 px-3 text-sm text-muted-foreground" aria-hidden>
        $
      </span>
      <input
        id={id}
        inputMode="decimal"
        placeholder="40"
        className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        value={value}
        onChange={(e) => {
          const next = cleanBudgetInput(e.target.value)
          // parseBudget treats "" and a lone "." as nothing, so those are always allowed.
          if ((parseBudget(next) ?? 0) <= MAX_BUDGET) onChange(next)
        }}
      />
    </div>
  )
}
