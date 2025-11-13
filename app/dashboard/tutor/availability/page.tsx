'use client'

import { useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AvailabilityCalendar } from '@/components/calendar/availability-calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function TutorAvailabilityPage() {
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)

  const handleSelectSlot = (start: Date, end: Date) => {
    setSelectedSlot({ start, end })
    // TODO: Open modal to create blocked time
    console.log('Selected slot:', { start, end })
  }

  const handleSelectEvent = (event: any) => {
    // TODO: Open modal to edit/delete blocked time
    console.log('Selected event:', event)
  }

  return (
    <RequireAuth requiredRole="tutor">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Availability</h1>
            <p className="text-muted-foreground mt-1">
              Block times when you're unavailable for tutoring sessions
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Availability Calendar</CardTitle>
              <CardDescription>
                Click and drag on the calendar to block time slots. Red blocks indicate times when you're unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                editable={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Block a time:</strong> Click and drag on the calendar to select a time range</p>
              <p>• <strong>Edit or delete:</strong> Click on an existing blocked time to modify or remove it</p>
              <p>• <strong>Switch views:</strong> Use the Month, Week, or Day buttons to change the calendar view</p>
              <p>• <strong>Navigate:</strong> Use the arrow buttons or "Today" button to move through time</p>
              <p>• All times are shown in your local timezone</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RequireAuth>
  )
}
