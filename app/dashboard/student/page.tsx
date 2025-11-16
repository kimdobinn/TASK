'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UpcomingSessions } from '@/components/booking/upcoming-sessions'
import { PendingRequests } from '@/components/booking/pending-requests'
import { BookingHistory } from '@/components/booking/booking-history'
import { ConnectionIndicator } from '@/components/realtime/connection-indicator'
import { getBookingRequests } from '@/lib/booking-requests'
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings'
import { useAuth } from '@/contexts/auth-context'
import type { BookingRequest } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Calendar, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function StudentDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Task 21, Subtask 2: Real-time subscription for student dashboard
  const { connectionState, isConnected } = useRealtimeBookings({
    userRole: 'student',
    userId: user?.id || '',
    onUpdate: (updatedBooking) => {
      // Show toast notification when booking status changes
      if (updatedBooking.status === 'approved') {
        toast.success('Your booking has been approved!', {
          description: `Session on ${new Date(updatedBooking.requested_start_time).toLocaleDateString()}`
        })
      } else if (updatedBooking.status === 'rejected') {
        toast.error('Your booking was declined', {
          description: updatedBooking.rejection_note || 'Please try booking a different time'
        })
      }

      // Refresh booking list
      fetchBookingRequests()
    },
    debug: process.env.NODE_ENV === 'development'
  })

  useEffect(() => {
    fetchBookingRequests()
  }, [])

  async function fetchBookingRequests() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getBookingRequests()
      setBookingRequests(data)
    } catch (err: any) {
      console.error('Error fetching booking requests:', err)
      setError(err.message || 'Failed to load your bookings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchBookingRequests()
  }

  // Filter bookings by status
  const upcomingBookings = bookingRequests.filter(
    (req) => req.status === 'approved' && new Date(req.requested_start_time) > new Date()
  )

  const pendingBookings = bookingRequests.filter((req) => req.status === 'pending')

  const pastBookings = bookingRequests.filter(
    (req) =>
      (req.status === 'approved' && new Date(req.requested_start_time) <= new Date()) ||
      req.status === 'rejected'
  )

  return (
    <RequireAuth requiredRole="student">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold">My Tutoring Sessions</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your tutoring sessions and booking requests
                </p>
              </div>
              {/* Real-time connection indicator */}
              <ConnectionIndicator state={connectionState} showLabel />
            </div>
            <Button onClick={() => router.push('/dashboard/student/book-session')}>
              <Plus className="mr-2 h-4 w-4" />
              Request New Session
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Dashboard Content */}
          {!isLoading && !error && (
            <>
              {/* Upcoming Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Sessions
                  </CardTitle>
                  <CardDescription>
                    Your approved tutoring sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UpcomingSessions bookings={upcomingBookings} onRefresh={handleRefresh} />
                </CardContent>
              </Card>

              {/* Pending Requests */}
              {pendingBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>
                      Waiting for tutor approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PendingRequests bookings={pendingBookings} onRefresh={handleRefresh} />
                  </CardContent>
                </Card>
              )}

              {/* Booking History */}
              <Card>
                <CardHeader>
                  <CardTitle>Session History</CardTitle>
                  <CardDescription>
                    Your past and rejected sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingHistory bookings={pastBookings} />
                </CardContent>
              </Card>

              {/* Empty State */}
              {bookingRequests.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get started by requesting your first tutoring session
                    </p>
                    <Button onClick={() => router.push('/dashboard/student/book-session')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Request New Session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </RequireAuth>
  )
}
