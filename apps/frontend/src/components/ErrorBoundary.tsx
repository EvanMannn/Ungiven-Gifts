import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches errors thrown while rendering anything inside it and shows a fallback instead of
 * letting React unmount the whole page. React only supports this through a class component;
 * there is no hook equivalent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  // Called during rendering when a child throws. The returned object is merged into state,
  // which switches render() over to the fallback.
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  // Called after the fallback renders: the place for side effects like logging.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center" role="alert">
        <TriangleAlert className="size-10 text-error" aria-hidden />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">
          This page hit an unexpected error. Reloading usually fixes it, and your saved progress is kept.
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-3 text-left text-xs">{error.message}</pre>
        )}
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="outline" asChild>
            {/* A plain link, not <Link>: a full page load guarantees a clean slate. */}
            <a href="/">Back home</a>
          </Button>
        </div>
      </div>
    )
  }
}
