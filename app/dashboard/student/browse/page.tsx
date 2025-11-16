'use client'

import { useEffect, useState } from 'react'
import { RequireAuth } from '@/components/auth/require-auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Search, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Tutor {
  id: string
  full_name: string
  time_zone: string
}

function BrowseTutorsContent() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchTutors() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, time_zone')
        .eq('role', 'tutor')
        .order('full_name', { ascending: true })

      if (!error && data) {
        setTutors(data)
      }

      setIsLoading(false)
    }

    fetchTutors()
  }, [])

  const filteredTutors = tutors.filter((tutor) =>
    tutor.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading tutors...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Tutors</h1>
          <p className="text-muted-foreground mt-1">
            Find and book sessions with available tutors
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tutors by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tutors List */}
        {filteredTutors.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery
                    ? 'No tutors found'
                    : 'No tutors available yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search query.'
                    : 'Check back later for available tutors.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTutors.map((tutor) => (
              <Card key={tutor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {tutor.full_name}
                  </CardTitle>
                  <CardDescription>
                    Timezone: {tutor.time_zone}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/student/book-session?tutor=${tutor.id}`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Book Session
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredTutors.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredTutors.length} of {tutors.length} tutor
            {tutors.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function BrowseTutorsPage() {
  return (
    <RequireAuth requiredRole="student">
      <BrowseTutorsContent />
    </RequireAuth>
  )
}
