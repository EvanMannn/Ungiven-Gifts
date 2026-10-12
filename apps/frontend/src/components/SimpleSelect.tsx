import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** shadcn Select for the common case of a flat list of string options. */
export function SimpleSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly (string | { value: string; label: string })[]
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn('w-full', className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const { value: v, label } = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
