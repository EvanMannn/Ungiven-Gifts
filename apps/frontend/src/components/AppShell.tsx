import { Link, Outlet, useLocation } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from './ErrorBoundary'
import { Wordmark } from './Wordmark'

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-border/60 bg-background/60 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
            <Link to="/" className="text-lg">
              <Wordmark />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
          {/* Keyed by path so navigating to another page clears a previous crash. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="py-6 text-center text-xs text-muted-foreground">
          Not affiliated with Wizards of the Coast. Happy brewing.
        </footer>
      </div>
      <Toaster position="bottom-center" />
    </TooltipProvider>
  )
}
