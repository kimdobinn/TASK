'use client'

import { useState, useEffect } from 'react'
import type { BookingRequest } from '@/types'
import { createClient } from '@/lib/supabase'
import { fromUTC, DATE_FORMATS } from '@/lib/timezone'
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cancelBookingRequest } from '@/lib/booking-requests'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  Calendar,
  BookOpen,
  User,
  Loader2,
  XCircle,
  CalendarCheck,
} from 'lucide-react'

interface UpcomingSessionsProps {
  bookings: BookingRequest[]
  onRefresh: () => void
}

export function UpcomingSessions({ bookings, onRefresh }: UpcomingSessionsProps) {
  const { toast } = useToast()
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Fetch tutor names
  useEffect(() => {
    async function fetchTutorNames() {
      const supabase = createClient()
      const tutorIds = [...new Set(bookings.map((b) => b.tutor_id))]

      const names: Record<string, string> = {}

      for (const tutorId of tutorIds) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', tutorId)
            .single()

          if (data) {
            names[tutorId] = data.full_name
          }
        } catch (error) {
          console.error('Error fetching tutor name:', error)
          names[tutorId] = 'Unknown Tutor'
        }
      }

      setTutorNames(names)
    }

    if (bookings.length > 0) {
      fetchTutorNames()
    }
  }, [bookings])

  const handleCancelClick = (booking: BookingRequest) => {
    setSelectedBooking(booking)
    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return

    setCancellingId(selectedBooking.id)
    try {
      await cancelBookingRequest(selectedBooking.id)
      toast({
        title: 'Session Cancelled',
        description: 'Your booking has been cancelled successfully.',
      })
      setShowCancelDialog(false)
      setSelectedBooking(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking',
        variant: 'destructive',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const getCountdown = (startTime: Date): string => {
    const now = currentTime
    const days = differenceInDays(startTime, now)
    const hours = differenceInHours(startTime, now) % 24
    const minutes = differenceInMinutes(startTime, now) % 60

    if (days > 0) {
      return `in ${days}d ${hours}h`
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `in ${minutes}m`
    } else {
      return 'Starting soon'
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No upcoming sessions</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your approved sessions will appear here
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => {
          const startTime = fromUTC(booking.requested_start_time)
          const endTime = fromUTC(booking.requested_end_time)
          const tutorName = tutorNames[booking.tutor_id] || 'Loading...'
          const countdown = getCountdown(startTime)

          return (
            <div
              key={booking.id}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{tutorName}</h3>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {countdown}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{booking.subject.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.duration_minutes} minutes</span>
                </div>

                <div className="flex items-start gap-2 text-sm sm:col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{format(startTime, DATE_FORMATS.DISPLAY_DATE)}</p>
                    <p className="text-muted-foreground">
                      {format(startTime, DATE_FORMATS.TIME_12H)} - {format(endTime, DATE_FORMATS.TIME_12H)}
                    </p>
                  </div>
                </div>
              </div>

              {booking.specific_requests && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium mb-1">Your Request</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {booking.specific_requests}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelClick(booking)}
                disabled={cancellingId === booking.id}
                className="w-full sm:w-auto"
              >
                {cancellingId === booking.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Session
                  </>
                )}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this tutoring session?
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="py-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Tutor:</span>{' '}
                {tutorNames[selectedBooking.tutor_id] || 'Loading...'}
              </p>
              <p>
                <span className="font-medium">Subject:</span>{' '}
                {selectedBooking.subject.replace('_', ' ')}
              </p>
              <p>
                <span className="font-medium">Time:</span>{' '}
                {format(fromUTC(selectedBooking.requested_start_time), DATE_FORMATS.DISPLAY_DATE_TIME)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setSelectedBooking(null)
              }}
              disabled={cancellingId !== null}
            >
              Keep Session
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancellingId !== null}
            >
              {cancellingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Session'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
