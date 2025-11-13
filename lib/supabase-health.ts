// Supabase connection health check utilities

import { createClient } from './supabase'
import { parseSupabaseError } from './supabase-errors'

export interface HealthCheckResult {
  healthy: boolean
  timestamp: string
  checks: {
    database: {
      healthy: boolean
      latency?: number
      error?: string
    }
    auth: {
      healthy: boolean
      error?: string
    }
  }
}

// Check database connectivity
async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> {
  try {
    const startTime = Date.now()
    const supabase = createClient()

    // Simple query to check connectivity
    const { error } = await supabase
      .from('subjects')
      .select('id')
      .limit(1)
      .single()

    const latency = Date.now() - startTime

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is acceptable for health check
      throw error
    }

    return {
      healthy: true,
      latency,
    }
  } catch (error) {
    const parsedError = parseSupabaseError(error)
    return {
      healthy: false,
      error: parsedError.message,
    }
  }
}

// Check auth service connectivity
async function checkAuthHealth(): Promise<{
  healthy: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    // Check if auth service is accessible
    const { error } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    return {
      healthy: true,
    }
  } catch (error) {
    const parsedError = parseSupabaseError(error)
    return {
      healthy: false,
      error: parsedError.message,
    }
  }
}

// Comprehensive health check
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const [databaseHealth, authHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkAuthHealth(),
  ])

  const healthy = databaseHealth.healthy && authHealth.healthy

  return {
    healthy,
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseHealth,
      auth: authHealth,
    },
  }
}

// Simple connectivity test
export async function testConnection(): Promise<boolean> {
  try {
    const result = await performHealthCheck()
    return result.healthy
  } catch {
    return false
  }
}
