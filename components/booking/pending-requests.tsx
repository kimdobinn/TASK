'use client'

import { useState, useEffect } from 'react'
import type { BookingRequest } from '@/types'
import { createClient } from '@/lib/supabase'
import { fromUTC, DATE_FORMATS } from '@/lib/timezone'
import { format } from 'date-fns'
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
  HourglassIcon,
} from 'lucide-react'

interface PendingRequestsProps {
  bookings: BookingRequest[]
  onRefresh: () => void
}

export function PendingRequests({ bookings, onRefresh }: PendingRequestsProps) {
  const { toast } = useToast()
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)

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
        title: 'Request Cancelled',
        description: 'Your booking request has been cancelled.',
      })
      setShowCancelDialog(false)
      setSelectedBooking(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel request',
        variant: 'destructive',
      })
    } finally {
      setCancellingId(null)
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HourglassIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No pending requests</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your pending requests will appear here
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
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  Pending
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

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Submitted {format(new Date(booking.created_at), DATE_FORMATS.DISPLAY_DATE_TIME)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelClick(booking)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking request?
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
                <span className="font-medium">Requested Time:</span>{' '}
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
              Keep Request
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
                'Cancel Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
