import { DumbbellIcon, HistoryIcon, ListIcon, LogOutIcon } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet } from 'react-router'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'

const NAV = [
  { to: '/workouts', label: 'Тренування', icon: DumbbellIcon },
  { to: '/history', label: 'Історія', icon: HistoryIcon },
  { to: '/exercises', label: 'Вправи', icon: ListIcon },
]

export function GuestLayout() {
  const { token } = useAuth()
  return token ? <Navigate to="/workouts" replace /> : <Outlet />
}

export function AppLayout() {
  const { token, user, logout } = useAuth()
  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 box-content flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur pt-[env(safe-area-inset-top)]">
        <Link to="/workouts" className="flex h-11 items-center font-semibold">
          Gym Tracker
        </Link>
        <div className="flex items-center gap-2">
          {user && <span className="max-w-32 truncate text-sm text-muted-foreground">{user.name}</span>}
          <Button variant="ghost" size="icon-lg" className="size-11" onClick={logout} aria-label="Вийти" title="Вийти">
            <LogOutIcon />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-2xl grid-cols-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground">Сторінку не знайдено</p>
      <Button asChild variant="outline">
        <Link to="/workouts">До тренувань</Link>
      </Button>
    </div>
  )
}
