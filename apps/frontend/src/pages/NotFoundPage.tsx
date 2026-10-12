import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundPage({ message = "There's nothing at this address." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-black text-highlight">404</p>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Back home</Link>
      </Button>
    </div>
  )
}
