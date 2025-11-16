'use client'

/**
 * Next.js Global Error Handler
 * Task 22, Subtask 2: App-level error boundary
 *
 * This file is automatically used by Next.js to handle errors
 * in the app directory (App Router)
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error:', error)
    }

    // In production, you might want to log to an error reporting service
    // e.g., Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
          </div>
          <CardDescription>
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error message in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm font-semibold">Error Details (Development Only):</p>
              <p className="text-sm font-mono text-muted-foreground break-words">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* User-friendly message in production */}
          {process.env.NODE_ENV === 'production' && error.digest && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Error ID: <span className="font-mono">{error.digest}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please provide this ID when contacting support
              </p>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Try refreshing the page</li>
              <li>Return to the home page</li>
              <li>Check your internet connection</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
