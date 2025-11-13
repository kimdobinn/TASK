import {
  createBlockedTime,
  getBlockedTimes,
  getBlockedTimeById,
  updateBlockedTime,
  deleteBlockedTime,
  checkBlockedTimeConflicts,
} from '@/lib/blocked-times'
import type { CreateBlockedTimeInput, UpdateBlockedTimeInput } from '@/types'

// Mock Supabase client with proper chaining
const createMockQueryBuilder = () => {
  const mockBuilder = {
    insert: jest.fn().mockReturnValue(mockBuilder),
    select: jest.fn().mockReturnValue(mockBuilder),
    update: jest.fn().mockReturnValue(mockBuilder),
    delete: jest.fn().mockReturnValue(mockBuilder),
    eq: jest.fn().mockReturnValue(mockBuilder),
    gte: jest.fn().mockReturnValue(mockBuilder),
    lte: jest.fn().mockReturnValue(mockBuilder),
    neq: jest.fn().mockReturnValue(mockBuilder),
    or: jest.fn().mockReturnValue(mockBuilder),
    order: jest.fn().mockReturnValue(mockBuilder),
    single: jest.fn(),
    mockResolvedValue: jest.fn(),
  }
  return mockBuilder
}

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => createMockQueryBuilder()),
  })),
}))

jest.mock('@/lib/supabase-errors', () => ({
  parseSupabaseError: jest.fn((error) => error),
}))

describe('Blocked Times CRUD Operations', () => {
  const mockUserId = 'test-tutor-id'
  const mockBlockedTime = {
    id: 'blocked-1',
    tutor_id: mockUserId,
    start_time: '2024-12-20T14:00:00Z',
    end_time: '2024-12-20T16:00:00Z',
    is_recurring: false,
    recurrence_pattern: null,
    created_at: '2024-12-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createBlockedTime', () => {
    it('should create a blocked time successfully', async () => {
      const input: CreateBlockedTimeInput = {
        start_time: '2024-12-20T14:00:00Z',
        end_time: '2024-12-20T16:00:00Z',
        is_recurring: false,
      }

      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      const mockBuilder = mockClient.from()
      mockBuilder.single.mockResolvedValue({
        data: mockBlockedTime,
        error: null,
      })

      const result = await createBlockedTime(input)

      expect(result).toEqual(mockBlockedTime)
      expect(mockClient.from).toHaveBeenCalledWith('blocked_times')
    })

    it('should throw error when end time is before start time', async () => {
      const input: CreateBlockedTimeInput = {
        start_time: '2024-12-20T16:00:00Z',
        end_time: '2024-12-20T14:00:00Z', // Before start time
        is_recurring: false,
      }

      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      await expect(createBlockedTime(input)).rejects.toThrow(
        'End time must be after start time'
      )
    })

    it('should throw error when user is not authenticated', async () => {
      const input: CreateBlockedTimeInput = {
        start_time: '2024-12-20T14:00:00Z',
        end_time: '2024-12-20T16:00:00Z',
        is_recurring: false,
      }

      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      await expect(createBlockedTime(input)).rejects.toThrow(
        'User must be authenticated'
      )
    })
  })

  describe('getBlockedTimes', () => {
    it('should fetch blocked times for current user', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })
      mockClient.from().mockResolvedValue({
        data: [mockBlockedTime],
        error: null,
      })

      const result = await getBlockedTimes()

      expect(result).toEqual([mockBlockedTime])
      expect(mockClient.from).toHaveBeenCalledWith('blocked_times')
    })

    it('should filter blocked times by date range', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      const startDate = new Date('2024-12-15')
      const endDate = new Date('2024-12-25')

      mockClient.from().mockResolvedValue({
        data: [mockBlockedTime],
        error: null,
      })

      await getBlockedTimes(mockUserId, startDate, endDate)

      expect(mockClient.from().gte).toHaveBeenCalled()
      expect(mockClient.from().lte).toHaveBeenCalled()
    })
  })

  describe('getBlockedTimeById', () => {
    it('should fetch a blocked time by ID', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().single.mockResolvedValue({
        data: mockBlockedTime,
        error: null,
      })

      const result = await getBlockedTimeById('blocked-1')

      expect(result).toEqual(mockBlockedTime)
    })

    it('should return null when blocked time not found', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      })

      const result = await getBlockedTimeById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateBlockedTime', () => {
    it('should update a blocked time successfully', async () => {
      const input: UpdateBlockedTimeInput = {
        end_time: '2024-12-20T17:00:00Z',
      }

      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().single.mockResolvedValue({
        data: { ...mockBlockedTime, ...input },
        error: null,
      })

      const result = await updateBlockedTime('blocked-1', input)

      expect(result.end_time).toBe(input.end_time)
      expect(mockClient.from).toHaveBeenCalledWith('blocked_times')
    })

    it('should throw error when end time is before start time', async () => {
      const input: UpdateBlockedTimeInput = {
        start_time: '2024-12-20T16:00:00Z',
        end_time: '2024-12-20T14:00:00Z',
      }

      await expect(updateBlockedTime('blocked-1', input)).rejects.toThrow(
        'End time must be after start time'
      )
    })
  })

  describe('deleteBlockedTime', () => {
    it('should delete a blocked time successfully', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().mockResolvedValue({
        error: null,
      })

      const result = await deleteBlockedTime('blocked-1')

      expect(result).toBe(true)
      expect(mockClient.from).toHaveBeenCalledWith('blocked_times')
    })
  })

  describe('checkBlockedTimeConflicts', () => {
    it('should detect overlapping blocked times', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().mockResolvedValue({
        data: [mockBlockedTime],
        error: null,
      })

      const conflicts = await checkBlockedTimeConflicts(
        mockUserId,
        '2024-12-20T15:00:00Z', // Overlaps with mock blocked time
        '2024-12-20T17:00:00Z'
      )

      expect(conflicts.length).toBeGreaterThan(0)
    })

    it('should exclude specific ID from conflict check', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()

      await checkBlockedTimeConflicts(
        mockUserId,
        '2024-12-20T15:00:00Z',
        '2024-12-20T17:00:00Z',
        'blocked-1'
      )

      expect(mockClient.from().neq).toHaveBeenCalledWith('id', 'blocked-1')
    })

    it('should not detect conflicts for non-overlapping times', async () => {
      const { createClient } = require('@/lib/supabase')
      const mockClient = createClient()
      mockClient.from().mockResolvedValue({
        data: [],
        error: null,
      })

      const conflicts = await checkBlockedTimeConflicts(
        mockUserId,
        '2024-12-20T10:00:00Z', // Does not overlap
        '2024-12-20T12:00:00Z'
      )

      expect(conflicts).toEqual([])
    })
  })

  describe('Validation', () => {
    it('should validate UTC timestamp format', () => {
      const validUTC = '2024-12-20T14:00:00Z'
      const date = new Date(validUTC)

      // ISO string includes milliseconds
      expect(date.toISOString()).toMatch(/2024-12-20T14:00:00\.\d{3}Z/)
      expect(date.getUTCHours()).toBe(14)
      expect(date.getUTCMinutes()).toBe(0)
    })

    it('should handle recurring pattern structure', () => {
      const recurrencePattern = {
        frequency: 'weekly' as const,
        interval: 1,
        days_of_week: [1, 3, 5], // Monday, Wednesday, Friday
        end_date: '2025-01-31T00:00:00Z',
      }

      expect(recurrencePattern.frequency).toBe('weekly')
      expect(recurrencePattern.days_of_week).toHaveLength(3)
    })
  })
})
