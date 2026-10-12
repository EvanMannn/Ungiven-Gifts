import { ClipboardList, Link2, Shuffle, Sparkles, Users, Wand2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wordmark } from '@/components/Wordmark'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20">
      <section className="flex flex-col items-center gap-5 pt-8 text-center sm:pt-16">
        <Badge variant="gold">Secret santa for Magic: The Gathering</Badge>
        <h1 className="text-5xl sm:text-7xl">
          <Wordmark />
        </h1>
        <p className="max-w-xl text-lg text-balance text-muted-foreground">
          Build a deck for a friend, get one built for you. Add your playgroup, set some deckbuilding restrictions, and
          everyone gets one link to see who they're brewing for.
        </p>
        <Button asChild size="xl" variant="holly" className="mt-4">
          <Link to="/create">
            <Sparkles />
            Create an event
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Free, and no account needed. Takes about two minutes.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Step icon={<ClipboardList />} title="1. Set it up">
          Name the event, pick the format, and list your players. You can import their questionnaire answers from a
          Google Form.
        </Step>
        <Step icon={<Shuffle />} title="2. We draw names">
          Everyone gets someone to build for. Rematches from last year can be ruled out, and players can be split into
          groups that can help each other.
        </Step>
        <Step icon={<Link2 />} title="3. Share one link">
          Players pick their name, set a password, and see their giftee, what that person likes, and their restriction.
        </Step>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Feature icon={<Wand2 />} title="Deckbuilding restrictions">
          Write a list like "mono-colored" or "no cards over $2". Each builder gets two of them to choose from.
        </Feature>
        <Feature icon={<Users />} title="Build groups">
          Split the table into groups that never gift each other, so groupmates can talk through their brews without
          spoiling a surprise.
        </Feature>
      </section>
    </div>
  )
}

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="gap-3">
      <CardContent className="flex flex-col gap-2">
        <div className="text-gold [&_svg]:size-6">{icon}</div>
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border/60 p-5">
      <div className="mt-0.5 text-primary [&_svg]:size-5">{icon}</div>
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
