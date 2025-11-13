'use client'

import { RequireAuth } from '@/components/auth/require-auth'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function StudentDashboardContent() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {profile?.full_name}!
            </p>
          </div>
          <Button onClick={() => signOut()} variant="outline">
            Sign out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Browse Tutors</CardTitle>
              <CardDescription>
                Find tutors and book sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Browse available tutors and their schedules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>View your upcoming sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: View and manage your booking requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Email:</span> {profile?.id}
                </p>
                <p>
                  <span className="font-medium">Role:</span> {profile?.role}
                </p>
                <p>
                  <span className="font-medium">Timezone:</span> {profile?.time_zone}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboardPage() {
  return (
    <RequireAuth requiredRole="student">
      <StudentDashboardContent />
    </RequireAuth>
  )
}
