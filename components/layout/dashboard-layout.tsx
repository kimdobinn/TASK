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
        <aside className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <DashboardNav />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
