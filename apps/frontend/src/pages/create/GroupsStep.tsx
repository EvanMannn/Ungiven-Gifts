import { Info } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { validGroupSizes } from './draft'

interface Props {
  participantCount: number
  groupSize: number | null
  onChange: (groupSize: number | null) => void
}

/** Asks whether to split the event into build groups, offering only sizes that divide evenly. */
export function GroupsStep({ participantCount, groupSize, onChange }: Props) {
  const sizes = validGroupSizes(participantCount)
  // "Yes" can be picked before a size is, so it needs its own state on top of groupSize.
  const [wantsGroups, setWantsGroups] = useState(groupSize !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Split everyone into build groups?
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="cursor-help text-muted-foreground" aria-label="What are build groups?">
                <Info className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Nobody gifts someone in their own group, so groupmates can talk about the decks they're building
              without spoiling a surprise.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Optional. Most events skip this.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {participantCount} people can't be split into equal groups, so this event won't use them.
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Use build groups">
              <Choice
                selected={!wantsGroups}
                onClick={() => {
                  setWantsGroups(false)
                  onChange(null)
                }}
              >
                No groups
              </Choice>
              <Choice selected={wantsGroups} onClick={() => setWantsGroups(true)}>
                Yes, split into groups
              </Choice>
            </div>

            {wantsGroups && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">How many people per group?</p>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="People per group">
                  {sizes.map((size) => (
                    <Choice key={size} selected={groupSize === size} onClick={() => onChange(size)}>
                      <span className="block font-bold">{size} per group</span>
                      <span className="text-xs text-muted-foreground">{participantCount / size} groups</span>
                    </Choice>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg border p-3 text-left text-sm transition-colors hover:border-gold/60',
        selected && 'border-gold bg-pine-deep/50',
      )}
    >
      {children}
    </button>
  )
}
