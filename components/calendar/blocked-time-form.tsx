'use client'

import { useState, useEffect } from 'react'
import { useTimezone } from '@/hooks/use-timezone'
import { useAuth } from '@/contexts/auth-context'
import {
  createBlockedTime,
  updateBlockedTime,
  checkBlockedTimeConflicts,
} from '@/lib/blocked-times'
import type { BlockedTime, CreateBlockedTimeInput, RecurrencePattern } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Loader2 } from 'lucide-react'

interface BlockedTimeFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialStart?: Date
  initialEnd?: Date
  existingBlockedTime?: BlockedTime
}

export function BlockedTimeForm({
  isOpen,
  onClose,
  onSuccess,
  initialStart,
  initialEnd,
  existingBlockedTime,
}: BlockedTimeFormProps) {
  const { user } = useAuth()
  const { userTimeZone, toUTC, fromUTC, format, DATE_FORMATS } = useTimezone()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<BlockedTime[]>([])

  // Form state
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [interval, setInterval] = useState('1')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  const isEditMode = !!existingBlockedTime

  // Initialize form with values
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setConflicts([])

      if (existingBlockedTime) {
        // Edit mode - load existing blocked time
        const start = fromUTC(existingBlockedTime.start_time, userTimeZone)
        const end = fromUTC(existingBlockedTime.end_time, userTimeZone)

        setStartDate(format(start, DATE_FORMATS.DATE))
        setStartTime(format(start, DATE_FORMATS.TIME_24))
        setEndDate(format(end, DATE_FORMATS.DATE))
        setEndTime(format(end, DATE_FORMATS.TIME_24))
        setIsRecurring(existingBlockedTime.is_recurring)

        if (existingBlockedTime.recurrence_pattern) {
          const pattern = existingBlockedTime.recurrence_pattern
          setFrequency(pattern.frequency)
          setInterval(pattern.interval?.toString() || '1')
          setDaysOfWeek(pattern.days_of_week || [])
          setRecurrenceEndDate(
            pattern.end_date ? format(new Date(pattern.end_date), DATE_FORMATS.DATE) : ''
          )
        }
      } else if (initialStart && initialEnd) {
        // Create mode - use initial selection
        setStartDate(format(initialStart, DATE_FORMATS.DATE))
        setStartTime(format(initialStart, DATE_FORMATS.TIME_24))
        setEndDate(format(initialEnd, DATE_FORMATS.DATE))
        setEndTime(format(initialEnd, DATE_FORMATS.TIME_24))
        setIsRecurring(false)
        setFrequency('weekly')
        setInterval('1')
        setDaysOfWeek([])
        setRecurrenceEndDate('')
      }
    }
  }, [isOpen, existingBlockedTime, initialStart, initialEnd, fromUTC, userTimeZone, format, DATE_FORMATS])

  // Check for conflicts when times change
  useEffect(() => {
    if (!startDate || !startTime || !endDate || !endTime || !user?.id) {
      if (conflicts.length > 0) {
        setConflicts([])
      }
      return
    }

    const checkConflicts = async () => {
      try {
        const startLocal = new Date(`${startDate}T${startTime}`)
        const endLocal = new Date(`${endDate}T${endTime}`)
        const startUTC = toUTC(startLocal, userTimeZone).toISOString()
        const endUTC = toUTC(endLocal, userTimeZone).toISOString()

        const foundConflicts = await checkBlockedTimeConflicts(
          user.id,
          startUTC,
          endUTC,
          existingBlockedTime?.id
        )
        setConflicts(foundConflicts)
      } catch (err) {
        console.error('Error checking conflicts:', err)
      }
    }

    const debounce = setTimeout(checkConflicts, 500)
    return () => clearTimeout(debounce)
  }, [startDate, startTime, endDate, endTime, user?.id, existingBlockedTime?.id])

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const validateForm = (): string | null => {
    if (!startDate || !startTime || !endDate || !endTime) {
      return 'All date and time fields are required'
    }

    const startLocal = new Date(`${startDate}T${startTime}`)
    const endLocal = new Date(`${endDate}T${endTime}`)

    if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
      return 'Invalid date or time format'
    }

    if (endLocal <= startLocal) {
      return 'End time must be after start time'
    }

    // Don't allow past dates for new blocked times
    if (!isEditMode) {
      const now = new Date()
      if (startLocal < now) {
        return 'Cannot create blocked time in the past'
      }
    }

    if (isRecurring) {
      if (frequency === 'weekly' && daysOfWeek.length === 0) {
        return 'Please select at least one day of the week for weekly recurrence'
      }

      if (recurrenceEndDate) {
        const recEndDate = new Date(`${recurrenceEndDate}T23:59:59`)
        if (recEndDate < startLocal) {
          return 'Recurrence end date must be after start date'
        }
      }
    }

    if (conflicts.length > 0) {
      return `This time conflicts with ${conflicts.length} existing blocked time${conflicts.length > 1 ? 's' : ''}`
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const startLocal = new Date(`${startDate}T${startTime}`)
      const endLocal = new Date(`${endDate}T${endTime}`)
      const startUTC = toUTC(startLocal, userTimeZone).toISOString()
      const endUTC = toUTC(endLocal, userTimeZone).toISOString()

      let recurrencePattern: RecurrencePattern | undefined = undefined
      if (isRecurring) {
        recurrencePattern = {
          frequency,
          interval: parseInt(interval, 10),
          days_of_week: frequency === 'weekly' ? daysOfWeek : undefined,
          end_date: recurrenceEndDate
            ? toUTC(new Date(`${recurrenceEndDate}T23:59:59`), userTimeZone).toISOString()
            : undefined,
        }
      }

      if (isEditMode && existingBlockedTime) {
        await updateBlockedTime(existingBlockedTime.id, {
          start_time: startUTC,
          end_time: endUTC,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
        })
      } else {
        const input: CreateBlockedTimeInput = {
          start_time: startUTC,
          end_time: endUTC,
          is_recurring: isRecurring,
          recurrence_pattern: recurrencePattern,
        }
        await createBlockedTime(input)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving blocked time:', err)
      setError(err.message || 'Failed to save blocked time')
    } finally {
      setIsLoading(false)
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Blocked Time' : 'Block Time Slot'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the blocked time details below.'
              : 'Mark this time as unavailable for tutoring sessions.'}
            {' Times are in '}<span className="font-medium">{userTimeZone}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Start Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* End Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Recurring Options */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label
                htmlFor="is-recurring"
                className="text-sm font-normal cursor-pointer"
              >
                Make this a recurring blocked time
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">Every</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      max="12"
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                    />
                  </div>
                </div>

                {frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex gap-2">
                      {dayNames.map((day, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={daysOfWeek.includes(index) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDayOfWeek(index)}
                          className="flex-1"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recurrence-end-date">
                    End Recurrence (optional)
                  </Label>
                  <Input
                    id="recurrence-end-date"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This time overlaps with {conflicts.length} existing blocked time
                {conflicts.length > 1 ? 's' : ''}. Please adjust the time or remove the
                conflicting blocked times.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || conflicts.length > 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update' : 'Block Time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
