'use client'

import { ReactNode } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DashboardNav } from '../navigation/dashboard-nav'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <DashboardHeader />

      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <aside
          className="hidden md:flex md:w-64 md:flex-col"
          aria-label="Main navigation"
        >
          <nav className="flex flex-col flex-grow pt-5 overflow-y-auto border-r bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <DashboardNav />
          </nav>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          className="flex-1"
          role="main"
          aria-label="Main content"
        >
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
