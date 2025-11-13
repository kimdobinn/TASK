'use client'

import { useState, useEffect } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BookingRequestsList } from '@/components/booking/booking-requests-list'
import { getBookingRequests } from '@/lib/booking-requests'
import type { BookingRequest, BookingStatus } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function TutorRequestsPage() {
  const [allRequests, setAllRequests] = useState<BookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('pending')

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getBookingRequests()
      setAllRequests(data)
    } catch (err: any) {
      console.error('Error fetching booking requests:', err)
      setError(err.message || 'Failed to load booking requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestUpdate = () => {
    fetchRequests()
  }

  const filterRequests = (status: BookingStatus | 'all'): BookingRequest[] => {
    if (status === 'all') return allRequests
    return allRequests.filter((req) => req.status === status)
  }

  const pendingCount = allRequests.filter((req) => req.status === 'pending').length
  const approvedCount = allRequests.filter((req) => req.status === 'approved').length
  const rejectedCount = allRequests.filter((req) => req.status === 'rejected').length

  return (
    <RequireAuth requiredRole="tutor">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Booking Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage student booking requests
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
                <CardTitle>Requests Overview</CardTitle>
                <CardDescription>
                  Manage your tutoring session requests by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BookingStatus | 'all')}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending" className="relative">
                      Pending
                      {pendingCount > 0 && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {pendingCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      Approved
                      {approvedCount > 0 && (
                        <span className="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                          {approvedCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      Rejected
                      {rejectedCount > 0 && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {rejectedCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="all">
                      All ({allRequests.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="mt-6">
                    <BookingRequestsList
                      requests={filterRequests('pending')}
                      onRequestUpdate={handleRequestUpdate}
                    />
                  </TabsContent>

                  <TabsContent value="approved" className="mt-6">
                    <BookingRequestsList
                      requests={filterRequests('approved')}
                      onRequestUpdate={handleRequestUpdate}
                    />
                  </TabsContent>

                  <TabsContent value="rejected" className="mt-6">
                    <BookingRequestsList
                      requests={filterRequests('rejected')}
                      onRequestUpdate={handleRequestUpdate}
                    />
                  </TabsContent>

                  <TabsContent value="all" className="mt-6">
                    <BookingRequestsList
                      requests={filterRequests('all')}
                      onRequestUpdate={handleRequestUpdate}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </RequireAuth>
  )
}
