/**
 * Accessibility Utilities
 * Task 23: Mobile Responsiveness and Accessibility
 *
 * Utilities for ARIA labels, keyboard navigation, and accessibility features
 */

// ============================================================================
// ARIA Label Generators
// ============================================================================

/**
 * Generate accessible label for booking status
 */
export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending approval',
    approved: 'Approved and confirmed',
    rejected: 'Declined by tutor',
    cancelled: 'Cancelled'
  }
  return labels[status] || status
}

/**
 * Generate accessible date label
 */
export function getAccessibleDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Generate accessible time label
 */
export function getAccessibleTimeLabel(time: string): string {
  // Assuming format: "HH:MM" or "HH:MM-HH:MM"
  if (time.includes('-')) {
    const [start, end] = time.split('-')
    return `from ${formatTime(start)} to ${formatTime(end)}`
  }
  return formatTime(time)
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Generate accessible duration label
 */
export function getDurationLabel(minutes: number | string): string {
  const mins = typeof minutes === 'string' ? parseInt(minutes) : minutes

  if (mins < 60) {
    return `${mins} minutes`
  }

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60

  if (remainingMins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  return `${hours} hour${hours > 1 ? 's' : ''} and ${remainingMins} minutes`
}

// ============================================================================
// Keyboard Navigation Utilities
// ============================================================================

/**
 * Keyboard event keys
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const

/**
 * Check if key is activation key (Enter or Space)
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === Keys.ENTER || event.key === Keys.SPACE
}

/**
 * Check if key is navigation key
 */
export function isNavigationKey(event: React.KeyboardEvent): boolean {
  return [
    Keys.ARROW_UP,
    Keys.ARROW_DOWN,
    Keys.ARROW_LEFT,
    Keys.ARROW_RIGHT,
    Keys.TAB,
    Keys.HOME,
    Keys.END
  ].includes(event.key as any)
}

/**
 * Prevent default for activation keys
 */
export function handleActivationKeyDown(
  event: React.KeyboardEvent,
  callback: () => void
) {
  if (isActivationKey(event)) {
    event.preventDefault()
    callback()
  }
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')

    return Array.from(container.querySelectorAll(selector))
  },

  /**
   * Trap focus within a container (for modals, dropdowns)
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent) {
    const focusableElements = this.getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.key === Keys.TAB) {
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  },

  /**
   * Save current focus and return function to restore it
   */
  saveFocus(): () => void {
    const activeElement = document.activeElement as HTMLElement
    return () => {
      activeElement?.focus()
    }
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst(container: HTMLElement) {
    const elements = this.getFocusableElements(container)
    elements[0]?.focus()
  },

  /**
   * Focus last focusable element in container
   */
  focusLast(container: HTMLElement) {
    const elements = this.getFocusableElements(container)
    elements[elements.length - 1]?.focus()
  }
}

// ============================================================================
// ARIA Live Region Announcer
// ============================================================================

/**
 * Announce message to screen readers using ARIA live regions
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only' // Visually hidden but accessible to screen readers
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// ============================================================================
// Screen Reader Only Text
// ============================================================================

/**
 * Generate props for screen reader only content
 */
export function screenReaderOnly() {
  return {
    className: 'sr-only',
    'aria-hidden': false
  }
}

// ============================================================================
// Reduced Motion Detection
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Apply animation class only if user doesn't prefer reduced motion
 */
export function animationClass(animationClass: string, fallbackClass: string = ''): string {
  return prefersReducedMotion() ? fallbackClass : animationClass
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Generate skip link ID for main content
 */
export const SKIP_LINK_IDS = {
  MAIN_CONTENT: 'main-content',
  NAVIGATION: 'main-navigation',
  SEARCH: 'search',
  FOOTER: 'footer'
} as const

// ============================================================================
// Color Contrast Utilities
// ============================================================================

/**
 * Check if color combination meets WCAG contrast requirements
 * @param foreground - Foreground color hex
 * @param background - Background color hex
 * @returns Contrast ratio and WCAG compliance
 */
export function checkContrastRatio(foreground: string, background: string): {
  ratio: number
  passesAA: boolean
  passesAAA: boolean
} {
  const fgLuminance = getRelativeLuminance(foreground)
  const bgLuminance = getRelativeLuminance(background)

  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) /
                (Math.min(fgLuminance, bgLuminance) + 0.05)

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7
  }
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0]
}

// ============================================================================
// Mobile Touch Utilities
// ============================================================================

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get appropriate click handler for touch/non-touch devices
 */
export function getClickHandler(handler: () => void) {
  return isTouchDevice()
    ? { onTouchEnd: handler }
    : { onClick: handler }
}

// ============================================================================
// Responsive Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

/**
 * Check if current viewport matches breakpoint
 */
export function matchesBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= BREAKPOINTS[breakpoint]
}

/**
 * Get current breakpoint name
 */
export function getCurrentBreakpoint(): keyof typeof BREAKPOINTS | 'xs' {
  if (typeof window === 'undefined') return 'xs'

  const width = window.innerWidth

  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'

  return 'xs'
}
