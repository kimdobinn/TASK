/**
 * Real-time connection status indicator
 * Task 21, Subtask 4: Connection State Handling
 */

'use client'

import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'
import type { ConnectionState } from '@/hooks/use-realtime-bookings'
import { cn } from '@/lib/utils'

interface ConnectionIndicatorProps {
  state: ConnectionState
  className?: string
  showLabel?: boolean
}

export function ConnectionIndicator({
  state,
  className,
  showLabel = false
}: ConnectionIndicatorProps) {
  const configs = {
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      animate: 'animate-spin'
    },
    connected: {
      icon: Wifi,
      label: 'Live updates active',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      animate: ''
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      animate: ''
    },
    error: {
      icon: AlertCircle,
      label: 'Connection error',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      animate: ''
    }
  }

  const config = configs[state]
  const Icon = config.icon

  if (!showLabel) {
    // Compact mode: just the icon
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full p-1.5',
          config.bgColor,
          className
        )}
        title={config.label}
      >
        <Icon className={cn('h-3.5 w-3.5', config.color, config.animate)} />
      </div>
    )
  }

  // Full mode: icon + label
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
        config.bgColor,
        className
      )}
    >
      <Icon className={cn('h-4 w-4', config.color, config.animate)} />
      <span className={cn('font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  )
}
