import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Home, Users, Settings, Flame } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: Home
    },
    {
      title: 'Trending',
      href: '/trending',
      icon: Flame
    },
    {
      title: 'Following',
      href: '/following',
      icon: Users
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings
    }
  ]

  return (
    <aside className={cn("w-64 shrink-0 border-r h-[calc(100vh-3.5rem)]", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}