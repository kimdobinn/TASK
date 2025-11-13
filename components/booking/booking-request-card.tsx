'use client'

import { useState, useEffect } from 'react'
import type { BookingRequest } from '@/types'
import { updateBookingRequestStatus } from '@/lib/booking-requests'
import { createClient } from '@/lib/supabase'
import { fromUTC, DATE_FORMATS } from '@/lib/timezone'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  Calendar,
  BookOpen,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react'

interface BookingRequestCardProps {
  request: BookingRequest
  onUpdate: () => void
}

export function BookingRequestCard({ request, onUpdate }: BookingRequestCardProps) {
  const { toast } = useToast()
  const [studentName, setStudentName] = useState<string>('Loading...')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')

  useEffect(() => {
    async function fetchStudentInfo() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', request.student_id)
          .single()

        if (data) {
          setStudentName(data.full_name)
        }
      } catch (error) {
        console.error('Error fetching student info:', error)
        setStudentName('Unknown Student')
      }
    }

    fetchStudentInfo()
  }, [request.student_id])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await updateBookingRequestStatus(request.id, 'approved')
      toast({
        title: 'Request Approved',
        description: 'The booking request has been approved successfully.',
      })
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await updateBookingRequestStatus(request.id, 'rejected', rejectionNote)
      toast({
        title: 'Request Rejected',
        description: 'The booking request has been rejected.',
      })
      setShowRejectDialog(false)
      setRejectionNote('')
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const startTime = fromUTC(request.requested_start_time)
  const endTime = fromUTC(request.requested_end_time)

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>
      default:
        return <Badge variant="outline">{request.status}</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {studentName}
              </CardTitle>
              <CardDescription>
                Requested {format(new Date(request.created_at), DATE_FORMATS.DISPLAY_DATE_TIME)}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Subject</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {request.subject.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {request.duration_minutes} minutes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Requested Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(startTime, DATE_FORMATS.DISPLAY_DATE)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(startTime, DATE_FORMATS.TIME_12H)} - {format(endTime, DATE_FORMATS.TIME_12H)}
                </p>
              </div>
            </div>

            {request.specific_requests && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Specific Requests</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.specific_requests}
                  </p>
                </div>
              </div>
            )}

            {request.rejection_note && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Rejection Note</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.rejection_note}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {request.status === 'pending' && (
          <CardFooter className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="flex-1"
              variant="default"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowRejectDialog(true)}
              disabled={isApproving || isRejecting}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this booking request from {studentName}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-note">
                Rejection Note (Optional)
              </Label>
              <Textarea
                id="rejection-note"
                placeholder="Let the student know why their request was rejected..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This note will be sent to the student
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionNote('')
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
