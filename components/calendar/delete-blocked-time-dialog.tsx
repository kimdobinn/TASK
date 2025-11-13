'use client'

import { useState } from 'react'
import { deleteBlockedTime } from '@/lib/blocked-times'
import type { BlockedTime } from '@/types'
import { useTimezone } from '@/hooks/use-timezone'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface DeleteBlockedTimeDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  blockedTime: BlockedTime | null
}

export function DeleteBlockedTimeDialog({
  isOpen,
  onClose,
  onSuccess,
  blockedTime,
}: DeleteBlockedTimeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { fromUTC, format, DATE_FORMATS, userTimeZone } = useTimezone()

  const handleDelete = async () => {
    if (!blockedTime) return

    setIsDeleting(true)
    setError(null)

    try {
      await deleteBlockedTime(blockedTime.id)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error deleting blocked time:', err)
      setError(err.message || 'Failed to delete blocked time')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!blockedTime) return null

  const start = fromUTC(blockedTime.start_time, userTimeZone)
  const end = fromUTC(blockedTime.end_time, userTimeZone)

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Blocked Time</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this blocked time?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-2">
          <div className="text-sm">
            <span className="font-medium">Start:</span>{' '}
            {format(start, DATE_FORMATS.FULL)}
          </div>
          <div className="text-sm">
            <span className="font-medium">End:</span>{' '}
            {format(end, DATE_FORMATS.FULL)}
          </div>
          {blockedTime.is_recurring && (
            <div className="text-sm">
              <span className="font-medium">Recurring:</span> Yes
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
