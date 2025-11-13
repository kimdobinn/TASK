'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { UserNav } from '../navigation/user-nav'
import { DashboardNav } from '../navigation/dashboard-nav'
import Link from 'next/link'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Mobile Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="py-4">
                <DashboardNav />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Class Scheduler</span>
          </Link>
        </div>

        {/* User Navigation */}
        <UserNav />
      </div>
    </header>
  )
}
