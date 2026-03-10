import { useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Activity,
  Brain,
  AlertTriangle,
  Bell,
  MessageSquare,
  BookOpen,
  Settings,
} from 'lucide-react'

const navItems = [
  { path: '/caregiver/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/caregiver/health', label: 'Health Timeline', icon: Activity },
  { path: '/caregiver/vibe-check', label: 'Vibe Check', icon: Brain },
  { path: '/caregiver/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/caregiver/reminders', label: 'Reminders', icon: Bell },
  { path: '/caregiver/messages', label: 'Messages', icon: MessageSquare },
  { path: '/caregiver/memories', label: 'Memory Book', icon: BookOpen },
  { path: '/caregiver/settings', label: 'Settings', icon: Settings },
]

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 p-4 md:block">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">GoldenCare</h2>
          <p className="text-xs text-muted-foreground">Caregiver Portal</p>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Caregiver navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} aria-label={item.label}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b p-2 md:hidden" role="navigation" aria-label="Caregiver mobile navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} aria-label={item.label}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`shrink-0 gap-1 ${
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="size-3" aria-hidden="true" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
