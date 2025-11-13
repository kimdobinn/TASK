'use client'

import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function StudentDashboardContent() {
  const { profile } = useAuth()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.full_name}!
          </p>
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
                  <span className="font-medium">Name:</span> {profile?.full_name}
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
    </DashboardLayout>
  )
}

export default function StudentDashboardPage() {
  return (
    <RequireAuth requiredRole="student">
      <StudentDashboardContent />
    </RequireAuth>
  )
}
