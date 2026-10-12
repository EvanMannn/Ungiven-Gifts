import { PartyPopper, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import type { EventCreated } from '@/api/types'
import { CopyField } from '@/components/CopyField'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { adminUrl, eventUrl } from '@/lib/format'

export function CreatedStep({ created, eventName }: { created: EventCreated; eventName: string }) {
  const playing = created.organizer_token !== null

  return (
    <Card className="mx-auto max-w-2xl border-gold/40">
      <CardHeader className="items-center text-center">
        <PartyPopper className="mx-auto size-10 text-gold" aria-hidden />
        <CardTitle className="text-2xl">{eventName} is ready</CardTitle>
        <CardDescription>Names are drawn. Send everyone the participant link.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Participant link</h3>
          <CopyField label="Participant link" value={eventUrl(created.slug)} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Admin page</h3>
          <CopyField label="Admin link" value={adminUrl(created.slug)} />
          <Alert className="border-gold/40">
            <ShieldAlert className="text-gold" />
            <AlertTitle>Log in with your admin password</AlertTitle>
            <AlertDescription>
              This browser is already logged in. Anywhere else, open this link or use the organizer login on the
              participant page. Remember: the admin password can't be reset.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-2">
        {playing && (
          <Button asChild variant="holly" size="lg">
            <Link to={`/e/${created.slug}`}>See who you drew</Link>
          </Button>
        )}
        <Button asChild variant={playing ? 'outline' : 'default'} size="lg">
          <Link to={`/e/${created.slug}/admin`}>Go to admin page</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
