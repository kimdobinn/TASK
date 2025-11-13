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

function TutorDashboardContent() {
  const { profile } = useAuth()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tutor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.full_name}!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Booking Requests</CardTitle>
              <CardDescription>Review and manage requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: View and approve/reject booking requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Block Unavailable Times</CardTitle>
              <CardDescription>Set your availability</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Block times when you're unavailable
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Schedule</CardTitle>
              <CardDescription>View your upcoming sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: View all confirmed sessions
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

export default function TutorDashboardPage() {
  return (
    <RequireAuth requiredRole="tutor">
      <TutorDashboardContent />
    </RequireAuth>
  )
}
