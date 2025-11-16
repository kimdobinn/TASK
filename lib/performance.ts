/**
 * Performance Optimization Utilities
 * Task 24: Performance monitoring and optimization helpers
 */

// ============================================================================
// Cache Utilities
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Simple in-memory cache with TTL support
 */
export class SimpleCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()

  set(key: string, data: T, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    const age = Date.now() - entry.timestamp

    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}

// ============================================================================
// Debounce & Throttle
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), waitMs)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limitMs)
    }
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

export function measurePerformance(name: string, callback: () => void) {
  const start = performance.now()
  callback()
  const end = performance.now()

  if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${name}: ${(end - start).toFixed(2)}ms`)
  }
}

export async function measureAsync(name: string, callback: () => Promise<void>) {
  const start = performance.now()
  await callback()
  const end = performance.now()

  if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${name}: ${(end - start).toFixed(2)}ms`)
  }
}
