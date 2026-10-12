import { Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-black tracking-tight', className)}>
      <Gift className="size-[1.1em] text-highlight" aria-hidden />
      <span>
        Ungiven <span className="text-brand-light">Gifts</span>
      </span>
    </span>
  )
}
