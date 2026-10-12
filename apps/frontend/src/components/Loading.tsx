import { Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label}…
    </div>
  )
}
