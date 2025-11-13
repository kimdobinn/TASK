import { NextResponse } from 'next/server'
import { performHealthCheck } from '@/lib/supabase-health'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const healthCheck = await performHealthCheck()

    const status = healthCheck.healthy ? 200 : 503

    return NextResponse.json(healthCheck, { status })
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}
