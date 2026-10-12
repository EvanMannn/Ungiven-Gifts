import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import { AppShell } from './components/AppShell'
import { Loading } from './components/Loading'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

// The landing page loads instantly; the heavier screens load when someone navigates to them.
const CreateEventPage = lazy(() => import('./pages/create/CreateEventPage'))
const EventPage = lazy(() => import('./pages/event/EventPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="create" element={<CreateEventPage />} />
            <Route path="e/:slug" element={<EventPage />} />
            <Route path="e/:slug/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
