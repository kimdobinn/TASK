'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getBlockedTimes } from '@/lib/blocked-times'
import { useTimezone } from '@/hooks/use-timezone'
import type { BlockedTime } from '@/types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': require('date-fns/locale/en-US'),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: BlockedTime
}

interface AvailabilityCalendarProps {
  tutorId?: string
  onSelectSlot?: (start: Date, end: Date) => void
  onSelectEvent?: (event: CalendarEvent) => void
  editable?: boolean
}

export function AvailabilityCalendar({
  tutorId,
  onSelectSlot,
  onSelectEvent,
  editable = true,
}: AvailabilityCalendarProps) {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const { userTimeZone, convertFromUTC } = useTimezone()

  // Fetch blocked times
  const fetchBlockedTimes = useCallback(async () => {
    try {
      setIsLoading(true)
      const times = await getBlockedTimes(tutorId)
      setBlockedTimes(times)
    } catch (error) {
      console.error('Error fetching blocked times:', error)
    } finally {
      setIsLoading(false)
    }
  }, [tutorId])

  useEffect(() => {
    fetchBlockedTimes()
  }, [fetchBlockedTimes])

  // Convert blocked times to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return blockedTimes.map((blocked) => ({
      id: blocked.id,
      title: 'Blocked',
      start: convertFromUTC(blocked.start_time, userTimeZone),
      end: convertFromUTC(blocked.end_time, userTimeZone),
      resource: blocked,
    }))
  }, [blockedTimes, convertFromUTC, userTimeZone])

  // Handle slot selection (for creating new blocked times)
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (editable && onSelectSlot) {
        onSelectSlot(start, end)
      }
    },
    [editable, onSelectSlot]
  )

  // Handle event click (for viewing/editing blocked times)
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (onSelectEvent) {
        onSelectEvent(event)
      }
    },
    [onSelectEvent]
  )

  // Custom event styling
  const eventStyleGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: '#ef4444',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }, [])

  // Navigation handlers
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setCurrentView(newView)
  }

  const navigateToPrevious = () => {
    const newDate = new Date(currentDate)
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateToNext = () => {
    const newDate = new Date(currentDate)
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateToToday = () => {
    setCurrentDate(new Date())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Custom Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigateToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </div>

        <div className="flex gap-2">
          <Button
            variant={currentView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('month')}
          >
            Month
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={currentView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('day')}
          >
            Day
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-lg border overflow-hidden calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={currentView}
          onView={handleViewChange}
          date={currentDate}
          onNavigate={handleNavigate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={editable}
          eventPropGetter={eventStyleGetter}
          popup
          step={30}
          timeslots={2}
          defaultDate={new Date()}
          toolbar={false} // Use custom toolbar
          formats={{
            timeGutterFormat: 'h a',
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            agendaTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
          }}
        />
      </div>

      {/* Info text */}
      <p className="text-sm text-muted-foreground">
        {editable
          ? 'Click and drag on the calendar to block time slots. Click on existing blocks to edit or delete.'
          : 'Red blocks indicate unavailable time slots.'}
        {' All times shown in '}
        <span className="font-medium">{userTimeZone}</span>
      </p>
    </div>
  )
}
