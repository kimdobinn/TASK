'use client'

import { useState, useCallback, useRef } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AvailabilityCalendar, type AvailabilityCalendarHandle } from '@/components/calendar/availability-calendar'
import { BlockedTimeForm } from '@/components/calendar/blocked-time-form'
import { DeleteBlockedTimeDialog } from '@/components/calendar/delete-blocked-time-dialog'
import type { BlockedTime } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

export default function TutorAvailabilityPage() {
  const calendarRef = useRef<AvailabilityCalendarHandle>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [selectedBlockedTime, setSelectedBlockedTime] = useState<BlockedTime | null>(null)
  const [actionMode, setActionMode] = useState<'create' | 'edit' | null>(null)

  const handleSelectSlot = useCallback((start: Date, end: Date) => {
    setSelectedSlot({ start, end })
    setSelectedBlockedTime(null)
    setActionMode('create')
    setFormOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: { resource: BlockedTime }) => {
    setSelectedBlockedTime(event.resource)
    setSelectedSlot(null)
    setActionMode('edit')
  }, [])

  const handleEditBlockedTime = useCallback(() => {
    if (selectedBlockedTime) {
      setFormOpen(true)
    }
  }, [selectedBlockedTime])

  const handleDeleteBlockedTime = useCallback(() => {
    if (selectedBlockedTime) {
      setDeleteDialogOpen(true)
    }
  }, [selectedBlockedTime])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setSelectedSlot(null)
    setSelectedBlockedTime(null)
    setActionMode(null)
  }, [])

  const handleFormSuccess = useCallback(() => {
    calendarRef.current?.refresh()
  }, [])

  const handleDeleteClose = useCallback(() => {
    setDeleteDialogOpen(false)
  }, [])

  const handleDeleteSuccess = useCallback(() => {
    setSelectedBlockedTime(null)
    setActionMode(null)
    calendarRef.current?.refresh()
  }, [])

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
                ref={calendarRef}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                editable={true}
              />
            </CardContent>
          </Card>

          {/* Selected Blocked Time Actions */}
          {selectedBlockedTime && actionMode === 'edit' && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Selected Blocked Time</CardTitle>
                <CardDescription>
                  Choose an action for this blocked time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEditBlockedTime}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDeleteBlockedTime}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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

        {/* Blocked Time Form Dialog */}
        <BlockedTimeForm
          isOpen={formOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          initialStart={selectedSlot?.start}
          initialEnd={selectedSlot?.end}
          existingBlockedTime={actionMode === 'edit' && selectedBlockedTime ? selectedBlockedTime : undefined}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteBlockedTimeDialog
          isOpen={deleteDialogOpen}
          onClose={handleDeleteClose}
          onSuccess={handleDeleteSuccess}
          blockedTime={selectedBlockedTime}
        />
      </DashboardLayout>
    </RequireAuth>
  )
}
