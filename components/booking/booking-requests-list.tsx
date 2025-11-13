'use client'

import { useState } from 'react'
import type { BookingRequest } from '@/types'
import { BookingRequestCard } from './booking-request-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Inbox } from 'lucide-react'

interface BookingRequestsListProps {
  requests: BookingRequest[]
  onRequestUpdate: () => void
}

export function BookingRequestsList({ requests, onRequestUpdate }: BookingRequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No booking requests found</p>
        <p className="text-sm text-muted-foreground mt-1">
          When students request sessions, they'll appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <BookingRequestCard
          key={request.id}
          request={request}
          onUpdate={onRequestUpdate}
        />
      ))}
    </div>
  )
}
