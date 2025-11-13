'use client'

import { useState, useEffect } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BookingForm } from '@/components/booking/booking-form'
import { getTutors } from '@/lib/tutors'
import type { TutorProfile } from '@/lib/tutors'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function BookSessionPage() {
  const [tutors, setTutors] = useState<TutorProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTutors() {
      try {
        setIsLoading(true)
        const data = await getTutors()
        setTutors(data)
      } catch (err: any) {
        console.error('Error fetching tutors:', err)
        setError(err.message || 'Failed to load tutors')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTutors()
  }, [])

  return (
    <RequireAuth requiredRole="student">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Book a Tutoring Session</h1>
            <p className="text-muted-foreground mt-1">
              Select a tutor and choose an available time slot
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && (
            <Card>
              <CardHeader>
                <CardTitle>New Booking Request</CardTitle>
                <CardDescription>
                  Fill out the form below to request a tutoring session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BookingForm tutors={tutors} />
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && tutors.length === 0 && (
            <Alert>
              <AlertDescription>
                No tutors are currently available. Please check back later.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DashboardLayout>
    </RequireAuth>
  )
}
