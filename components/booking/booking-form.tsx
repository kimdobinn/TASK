'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, addDays, startOfDay } from 'date-fns'
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBookingRequest } from '@/lib/booking-requests'
import { getOnlyAvailableSlots, groupSlotsByDay, type TimeSlot } from '@/lib/availability'
import type { TutorProfile } from '@/lib/tutors'
import { toUTC, fromUTC, DATE_FORMATS } from '@/lib/timezone'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

// Subtask 10.1: Form Structure and Validation Schema
const bookingFormSchema = z.object({
  tutorId: z.string().min(1, 'Please select a tutor'),
  subject: z.string().min(1, 'Please select a subject'),
  duration: z.enum(['30', '60', '120']),
  date: z.date(),
  timeSlot: z.string().min(1, 'Please select a time slot'),
  specificRequests: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingFormSchema>

const SUBJECTS = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'english', label: 'English' },
  { value: 'history', label: 'History' },
  { value: 'other', label: 'Other' },
]

const DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
]

interface BookingFormProps {
  tutors: TutorProfile[]
}

export function BookingForm({ tutors }: BookingFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [error, setError] = useState<string | null>(null)

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      tutorId: '',
      subject: '',
      duration: '60',
      specificRequests: '',
    },
  })

  const selectedTutorId = form.watch('tutorId')
  const selectedDate = form.watch('date')
  const selectedDuration = form.watch('duration')

  // Subtask 10.4: Real-time availability checking
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedTutorId || !selectedDate || !selectedDuration) {
        setAvailableSlots([])
        return
      }

      setIsLoadingSlots(true)
      setError(null)

      try {
        const startOfSelectedDay = startOfDay(selectedDate)
        const endOfSelectedDay = addDays(startOfSelectedDay, 1)

        const slots = await getOnlyAvailableSlots({
          tutorId: selectedTutorId,
          startDate: startOfSelectedDay,
          endDate: endOfSelectedDay,
          slotDurationMinutes: parseInt(selectedDuration),
          businessHoursOnly: true,
          businessHoursStart: 9,
          businessHoursEnd: 17,
        })

        setAvailableSlots(slots)

        // Clear time slot selection if current selection is no longer available
        const currentTimeSlot = form.getValues('timeSlot')
        if (currentTimeSlot) {
          const isStillAvailable = slots.some(
            (slot) => slot.start.toISOString() === currentTimeSlot
          )
          if (!isStillAvailable) {
            form.setValue('timeSlot', '')
          }
        }
      } catch (err: any) {
        console.error('Error fetching availability:', err)
        setError(err.message || 'Failed to load available time slots')
        setAvailableSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    }

    fetchAvailability()
  }, [selectedTutorId, selectedDate, selectedDuration, form])

  // Subtask 10.5: Form submission with timezone conversion
  async function onSubmit(values: BookingFormValues) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Convert selected time slot to UTC
      const startTime = new Date(values.timeSlot)
      const durationMs = parseInt(values.duration) * 60 * 1000
      const endTime = new Date(startTime.getTime() + durationMs)

      // Create booking request
      await createBookingRequest({
        tutor_id: values.tutorId,
        subject: values.subject,
        duration_minutes: parseInt(values.duration) as 30 | 60 | 120,
        requested_start_time: toUTC(startTime),
        requested_end_time: toUTC(endTime),
        specific_requests: values.specificRequests,
      })

      toast({
        title: 'Booking request submitted',
        description: 'Your tutor will review your request and respond soon.',
      })

      // Redirect to student dashboard
      router.push('/dashboard/student')
    } catch (err: any) {
      console.error('Error submitting booking request:', err)
      setError(err.message || 'Failed to submit booking request')
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit booking request',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tutor Selection */}
        <FormField
          control={form.control}
          name="tutorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Tutor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tutor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tutors.map((tutor) => (
                    <SelectItem key={tutor.id} value={tutor.id}>
                      {tutor.full_name} ({tutor.time_zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the tutor you'd like to book a session with
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subject Selection - Subtask 10.3 */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                What subject do you need help with?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Duration Selection - Subtask 10.3 */}
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Duration</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                How long do you need the tutoring session to be?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Selection - Subtask 10.2 */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Preferred Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, DATE_FORMATS.DISPLAY_DATE)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < startOfDay(new Date()) || date > addDays(new Date(), 60)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select a date within the next 60 days
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Time Slot Selection - Subtask 10.2 & 10.4 */}
        <FormField
          control={form.control}
          name="timeSlot"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Time Slots</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!selectedTutorId || !selectedDate || isLoadingSlots}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      isLoadingSlots
                        ? 'Loading available slots...'
                        : !selectedTutorId
                        ? 'Select a tutor first'
                        : !selectedDate
                        ? 'Select a date first'
                        : availableSlots.length === 0
                        ? 'No available slots'
                        : 'Choose a time slot'
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    availableSlots.map((slot) => (
                      <SelectItem
                        key={slot.start.toISOString()}
                        value={slot.start.toISOString()}
                      >
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          {format(fromUTC(slot.start.toISOString()), DATE_FORMATS.TIME_12H)} -{' '}
                          {format(fromUTC(slot.end.toISOString()), DATE_FORMATS.TIME_12H)}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {availableSlots.length > 0
                  ? `${availableSlots.length} slot${availableSlots.length === 1 ? '' : 's'} available`
                  : selectedTutorId && selectedDate && !isLoadingSlots
                  ? 'No available slots for this date. Try another date.'
                  : 'Available time slots will appear after selecting tutor, date, and duration'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Specific Requests */}
        <FormField
          control={form.control}
          name="specificRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specific Requests (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific topics you'd like to cover or questions you have..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Let your tutor know if there are specific areas you need help with
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || isLoadingSlots}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Booking Request'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/student')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
