'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRoleRedirectPath } from '@/lib/auth-config'

export default function Home() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (!isLoading && user && profile) {
      const dashboardPath = getRoleRedirectPath(profile.role)
      router.push(dashboardPath)
    }
  }, [user, profile, isLoading, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <h1 className="text-2xl font-bold">Class Scheduler</h1>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Schedule Tutoring Sessions
            <br />
            <span className="text-primary">Made Easy</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Connect students with tutors, manage availability, and book sessions
            seamlessly. All in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">For Students</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Browse available tutors</li>
                <li>✓ View real-time availability</li>
                <li>✓ Request sessions by subject and duration</li>
                <li>✓ Track booking status</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">For Tutors</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Manage your availability</li>
                <li>✓ Block unavailable times</li>
                <li>✓ Review booking requests</li>
                <li>✓ Approve or reject sessions</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
