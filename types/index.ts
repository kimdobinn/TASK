// Core type definitions for Class Scheduler

export type UserRole = 'student' | 'tutor';

export type BookingStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  time_zone: string;
  created_at: string;
}

export interface BlockedTime {
  id: string;
  tutor_id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_pattern?: Record<string, unknown>;
  created_at: string;
}

export interface BookingRequest {
  id: string;
  student_id: string;
  tutor_id: string;
  subject: string;
  duration_minutes: 30 | 60 | 120;
  requested_start_time: string;
  requested_end_time: string;
  specific_requests: string;
  status: BookingStatus;
  rejection_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}
