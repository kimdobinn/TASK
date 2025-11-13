'use client'

import { useState, useEffect } from 'react'
import type { BookingRequest, BookingStatus } from '@/types'
import { createClient } from '@/lib/supabase'
import { fromUTC, DATE_FORMATS } from '@/lib/timezone'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Calendar,
  BookOpen,
  User,
  XCircle,
  CheckCircle2,
  History,
} from 'lucide-react'

interface BookingHistoryProps {
  bookings: BookingRequest[]
}

export function BookingHistory({ bookings }: BookingHistoryProps) {
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')

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

  const filteredBookings =
    statusFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === statusFilter)

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No session history</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your completed and rejected sessions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter:</span>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'all' | BookingStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="approved">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No {statusFilter !== 'all' ? statusFilter : ''} sessions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const startTime = fromUTC(booking.requested_start_time)
            const endTime = fromUTC(booking.requested_end_time)
            const tutorName = tutorNames[booking.tutor_id] || 'Loading...'

            return (
              <div
                key={booking.id}
                className="border rounded-lg p-4 bg-muted/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{tutorName}</h3>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                  <div className="mt-4 p-3 bg-background rounded-md border">
                    <p className="text-sm font-medium mb-1">Your Request</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {booking.specific_requests}
                    </p>
                  </div>
                )}

                {booking.rejection_note && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900 mb-1">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-red-700 whitespace-pre-wrap">
                          {booking.rejection_note}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
