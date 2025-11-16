'use client'

/**
 * Skip Links Component
 * Task 23: Accessibility - Skip to main content navigation
 */

import Link from 'next/link'
import { SKIP_LINK_IDS } from '@/lib/accessibility'

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <Link
        href={`#${SKIP_LINK_IDS.MAIN_CONTENT}`}
        className="fixed top-0 left-0 z-[9999] bg-primary text-primary-foreground px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </Link>
    </div>
  )
}
