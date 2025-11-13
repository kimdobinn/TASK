'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Clock, FileText, Home, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/use-role'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('student' | 'tutor')[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  // Student Navigation
  {
    title: 'Browse Tutors',
    href: '/dashboard/student/browse',
    icon: Users,
    roles: ['student'],
  },
  {
    title: 'My Bookings',
    href: '/dashboard/student/bookings',
    icon: Calendar,
    roles: ['student'],
  },
  // Tutor Navigation
  {
    title: 'Booking Requests',
    href: '/dashboard/tutor/requests',
    icon: FileText,
    roles: ['tutor'],
  },
  {
    title: 'Manage Availability',
    href: '/dashboard/tutor/availability',
    icon: Clock,
    roles: ['tutor'],
  },
  {
    title: 'My Schedule',
    href: '/dashboard/tutor/schedule',
    icon: Calendar,
    roles: ['tutor'],
  },
  // Common
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { role } = useRole()

  // Filter nav items based on user role
  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true // Show items without role restriction
    return item.roles.includes(role as 'student' | 'tutor')
  })

  return (
    <nav className="flex flex-col gap-2 px-3">
      {filteredItems.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

        // Add separator before Settings
        const showSeparator = item.title === 'Settings' && index > 0

        return (
          <div key={item.href}>
            {showSeparator && <Separator className="my-2" />}
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
