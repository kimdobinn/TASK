'use client'

import { useEffect, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Calendar, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { useTimezone } from '@/hooks/use-timezone'

interface BookingRequest {
  id: string
  student_id: string
  requested_start_time: string
  requested_end_time: string
  duration_minutes: number
  status: string
  subject: {
    name: string
  }
  student: {
    full_name: string
  }
}

function TutorScheduleContent() {
  const { user } = useAuth()
  const { fromUTC } = useTimezone()
  const [approvedBookings, setApprovedBookings] = useState<BookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchApprovedBookings() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          id,
          student_id,
          requested_start_time,
          requested_end_time,
          duration_minutes,
          status,
          subject:subjects(name),
          student:user_profiles!booking_requests_student_id_fkey(full_name)
        `)
        .eq('tutor_id', user.id)
        .eq('status', 'approved')
        .order('requested_start_time', { ascending: true })

      if (!error && data) {
        setApprovedBookings(data as unknown as BookingRequest[])
      }

      setIsLoading(false)
    }

    fetchApprovedBookings()
  }, [user])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your schedule...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-1">
            View all your confirmed tutoring sessions
          </p>
        </div>

        {approvedBookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No scheduled sessions</h3>
                <p className="text-muted-foreground">
                  You don't have any confirmed tutoring sessions yet. Approved booking
                  requests will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {approvedBookings.map((booking) => {
              const startTime = fromUTC(booking.requested_start_time)
              const endTime = fromUTC(booking.requested_end_time)

              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {booking.subject?.name || 'Subject not specified'}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(startTime), 'EEEE, MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(startTime), 'h:mm a')} -{' '}
                          {format(new Date(endTime), 'h:mm a')}
                        </span>
                        <span className="text-muted-foreground">
                          ({booking.duration_minutes} minutes)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Student: {booking.student?.full_name}</span>
                      </div>

                      <div className="pt-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Confirmed
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function TutorSchedulePage() {
  return (
    <RequireAuth requiredRole="tutor">
      <TutorScheduleContent />
    </RequireAuth>
  )
}
