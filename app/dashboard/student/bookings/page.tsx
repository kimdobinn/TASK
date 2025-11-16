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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useTimezone } from '@/hooks/use-timezone'

interface BookingRequest {
  id: string
  tutor_id: string
  requested_start_time: string
  requested_end_time: string
  duration_minutes: number
  status: string
  specific_requests?: string
  rejection_note?: string
  subject: {
    name: string
  }
  tutor: {
    full_name: string
  }
}

function StudentBookingsContent() {
  const { user } = useAuth()
  const { convertToUserTimeZone } = useTimezone()
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBookings() {
      if (!user) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          id,
          tutor_id,
          requested_start_time,
          requested_end_time,
          duration_minutes,
          status,
          specific_requests,
          rejection_note,
          subject:subjects(name),
          tutor:user_profiles!booking_requests_tutor_id_fkey(full_name)
        `)
        .eq('student_id', user.id)
        .order('requested_start_time', { ascending: false })

      if (!error && data) {
        setBookings(data as unknown as BookingRequest[])
      }

      setIsLoading(false)
    }

    fetchBookings()
  }, [user])

  const pendingBookings = bookings.filter((b) => b.status === 'pending')
  const approvedBookings = bookings.filter((b) => b.status === 'approved')
  const rejectedBookings = bookings.filter((b) => b.status === 'rejected')

  const renderBookingCard = (booking: BookingRequest) => {
    const startTime = convertToUserTimeZone(booking.requested_start_time)
    const endTime = convertToUserTimeZone(booking.requested_end_time)

    let statusIcon
    let statusColor
    let statusText

    switch (booking.status) {
      case 'pending':
        statusIcon = <AlertCircle className="h-4 w-4" />
        statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        statusText = 'Pending'
        break
      case 'approved':
        statusIcon = <CheckCircle className="h-4 w-4" />
        statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        statusText = 'Approved'
        break
      case 'rejected':
        statusIcon = <XCircle className="h-4 w-4" />
        statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        statusText = 'Rejected'
        break
      default:
        statusIcon = null
        statusColor = 'bg-gray-100 text-gray-800'
        statusText = booking.status
    }

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
              <span>Tutor: {booking.tutor?.full_name}</span>
            </div>

            {booking.specific_requests && (
              <div className="text-sm">
                <p className="font-medium mb-1">Your request:</p>
                <p className="text-muted-foreground">{booking.specific_requests}</p>
              </div>
            )}

            {booking.rejection_note && (
              <div className="text-sm">
                <p className="font-medium mb-1 text-red-600">Rejection reason:</p>
                <p className="text-muted-foreground">{booking.rejection_note}</p>
              </div>
            )}

            <div className="pt-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
                {statusIcon}
                {statusText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your bookings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your tutoring session requests
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">
                      Start by browsing tutors and booking your first session!
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {bookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            {pendingBookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-muted-foreground">
                      You don't have any pending booking requests.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approvedBookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No approved sessions</h3>
                    <p className="text-muted-foreground">
                      You don't have any approved tutoring sessions yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedBookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No rejected requests</h3>
                    <p className="text-muted-foreground">
                      You don't have any rejected booking requests.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default function StudentBookingsPage() {
  return (
    <RequireAuth requiredRole="student">
      <StudentBookingsContent />
    </RequireAuth>
  )
}
