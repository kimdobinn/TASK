'use client'

import { useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { useTimezone } from '@/hooks/use-timezone'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TimeZoneSelector } from '@/components/timezone/timezone-selector'
import { getUserFriendlyErrorMessage } from '@/lib/supabase-errors'

function SettingsContent() {
  const { profile, user, refreshProfile } = useAuth()
  const { userTimeZone } = useTimezone()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [timeZone, setTimeZone] = useState(userTimeZone)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          time_zone: timeZone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)

      if (updateError) {
        throw updateError
      }

      // Refresh the profile data
      await refreshProfile()

      setSuccess('Settings updated successfully!')
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    type="text"
                    value={profile?.role || ''}
                    disabled
                    className="bg-muted capitalize"
                  />
                  <p className="text-xs text-muted-foreground">
                    Role cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <TimeZoneSelector
                    value={timeZone}
                    onChange={setTimeZone}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    All session times will be displayed in your selected timezone
                  </p>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Read-only account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">User ID:</span>
                <p className="text-muted-foreground font-mono text-xs mt-1">
                  {user?.id}
                </p>
              </div>
              <div>
                <span className="font-medium">Account Created:</span>
                <p className="text-muted-foreground mt-1">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  )
}
