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
  recurrence_pattern?: RecurrencePattern;
  created_at: string;
  updated_at?: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number; // e.g., every 2 weeks
  days_of_week?: number[]; // 0-6, Sunday to Saturday
  end_date?: string; // When the recurrence should stop
}

export interface CreateBlockedTimeInput {
  start_time: string; // ISO string in UTC
  end_time: string; // ISO string in UTC
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
}

export interface UpdateBlockedTimeInput {
  start_time?: string;
  end_time?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
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

export type NotificationType =
  | 'booking_request'
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  related_booking_id?: string;
  created_at: string;
  read_at?: string;
}
