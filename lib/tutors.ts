import { createClient } from '@/lib/supabase'
import { parseSupabaseError } from '@/lib/supabase-errors'

export interface TutorProfile {
  id: string
  full_name: string
  time_zone: string
  email: string
}

/**
 * Get all tutors
 */
export async function getTutors(): Promise<TutorProfile[]> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, time_zone, email')
      .eq('role', 'tutor')
      .order('full_name')

    if (error) {
      throw parseSupabaseError(error)
    }

    return (data || []) as TutorProfile[]
  } catch (error) {
    console.error('Error fetching tutors:', error)
    throw error
  }
}

/**
 * Get a single tutor by ID
 */
export async function getTutorById(id: string): Promise<TutorProfile | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, time_zone, email')
      .eq('id', id)
      .eq('role', 'tutor')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw parseSupabaseError(error)
    }

    return data as TutorProfile
  } catch (error) {
    console.error('Error fetching tutor:', error)
    throw error
  }
}
