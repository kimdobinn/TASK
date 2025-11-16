# Real-time Dashboard Updates - Testing Guide

**Task 21: Real-time Dashboard Updates**

This guide covers testing the real-time subscription system across student and tutor dashboards.

---

## Prerequisites

Before testing:
- ✅ Supabase project configured
- ✅ Real-time enabled on booking_requests table
- ✅ Both student and tutor test accounts
- ✅ Multiple browser sessions or incognito windows

---

## Test Scenario 1: Student Dashboard - Booking Status Updates

### Setup
1. Open Student Dashboard in Browser A
2. Login as a student with pending booking requests
3. Note the connection indicator (should show "Live updates active")

### Test 1.1: Booking Approval Notification

**Steps:**
1. Keep Student Dashboard open (Browser A)
2. Open Tutor Dashboard in Browser B
3. Login as the tutor for the student's booking
4. Approve a pending booking

**Expected Results:**
- ✅ Student dashboard updates automatically (no refresh needed)
- ✅ Toast notification appears: "Your booking has been approved!"
- ✅ Booking moves from "Pending" to "Upcoming Sessions"
- ✅ Connection indicator remains green

**Actual Behavior:**
```
[ ] Toast notification shown
[ ] Booking status updated in UI
[ ] No page refresh required
[ ] Connection indicator stays green
```

### Test 1.2: Booking Rejection Notification

**Steps:**
1. Student Dashboard open (Browser A)
2. Tutor Dashboard open (Browser B)
3. Tutor rejects a booking with rejection note

**Expected Results:**
- ✅ Toast notification: "Your booking was declined"
- ✅ Rejection note displayed in description
- ✅ Booking moves to history
- ✅ UI updates instantly

---

## Test Scenario 2: Tutor Dashboard - New Booking Requests

### Test 2.1: New Booking Notification

**Steps:**
1. Open Tutor Dashboard in Browser A
2. Login as tutor
3. Open student booking form in Browser B
4. Submit new booking request

**Expected Results:**
- ✅ Toast notification: "New booking request received!"
- ✅ Pending count badge updates (+1)
- ✅ New booking appears in pending list
- ✅ No manual refresh needed
- ✅ "View" button in toast switches to pending tab

**Actual Behavior:**
```
[ ] Toast notification shown
[ ] Badge count incremented
[ ] New booking in list
[ ] Automatic UI update
```

### Test 2.2: Multiple Simultaneous Bookings

**Steps:**
1. Tutor Dashboard open (Browser A)
2. Create 3 booking requests rapidly (Browser B, C, D)
3. Observe tutor dashboard behavior

**Expected Results:**
- ✅ All 3 bookings appear in real-time
- ✅ Toast notifications for each (may stack)
- ✅ Counter updates correctly
- ✅ No duplicate entries
- ✅ No UI flickering

---

## Test Scenario 3: Connection State Management

### Test 3.1: Normal Connection

**Expected Indicator States:**
```
connecting  → Yellow "Connecting..."
connected   → Green "Live updates active"
```

**Visual Check:**
- [ ] Green indicator with wifi icon
- [ ] "Live updates active" label

### Test 3.2: Network Interruption

**Steps:**
1. Dashboard open with active connection
2. Disable network in browser DevTools (Network tab → Offline)
3. Wait 5-10 seconds
4. Re-enable network

**Expected Behavior:**
```
connected → disconnected → connecting → connected
```

**Visual Check:**
- [ ] Indicator turns gray/red when offline
- [ ] Shows "Disconnected" or "Connection error"
- [ ] Automatically reconnects when online
- [ ] Returns to green "Live updates active"

### Test 3.3: Page Navigation

**Steps:**
1. Student dashboard open
2. Navigate to "Book Session" page
3. Return to dashboard

**Expected Results:**
- ✅ Old subscription cleaned up (no memory leak)
- ✅ New subscription established
- ✅ Connection indicator shows connecting → connected
- ✅ Real-time updates work after navigation

---

## Test Scenario 4: Multi-Session Testing

### Test 4.1: Same User, Multiple Tabs

**Steps:**
1. Open Student Dashboard in Tab 1
2. Open Student Dashboard in Tab 2 (same user)
3. Tutor approves a booking

**Expected Results:**
- ✅ Both tabs update simultaneously
- ✅ Toast notifications appear in both
- ✅ No conflicts or race conditions
- ✅ Both connections remain stable

### Test 4.2: Different Users Simultaneously

**Steps:**
1. Browser A: Student 1 Dashboard
2. Browser B: Student 2 Dashboard
3. Browser C: Tutor Dashboard
4. Tutor performs various actions

**Expected Results:**
- ✅ Student 1 sees only their updates
- ✅ Student 2 sees only their updates
- ✅ Tutor sees all new requests
- ✅ No cross-user data leakage

---

## Test Scenario 5: Performance Testing

### Test 5.1: Rapid Status Changes

**Steps:**
1. Create 10 pending bookings
2. Rapidly approve/reject them (< 1 second apart)

**Expected Results:**
- ✅ All updates processed
- ✅ No missed notifications
- ✅ UI remains responsive
- ✅ No console errors
- ✅ Updates complete within 2 seconds each

### Test 5.2: Large Dataset

**Steps:**
1. Account with 50+ booking requests
2. Update one booking status

**Expected Results:**
- ✅ Specific booking updates instantly
- ✅ No full list re-fetch required
- ✅ Page remains responsive
- ✅ Memory usage stable

---

## Test Scenario 6: Error Handling

### Test 6.1: Invalid User ID

**Steps:**
1. Modify code temporarily to pass empty userId
2. Load dashboard

**Expected Results:**
- ✅ No subscription established
- ✅ Warning in console (dev mode)
- ✅ Dashboard still loads
- ✅ Manual refresh works

### Test 6.2: Supabase Realtime Disabled

**Steps:**
1. Temporarily disable Realtime in Supabase
2. Load dashboard

**Expected Results:**
- ✅ Connection indicator shows error
- ✅ Dashboard functions normally (polling mode)
- ✅ No crashes
- ✅ Error message in console

---

## Debugging Tools

### Browser DevTools Console

**Enable debug mode:**
```typescript
// In useRealtimeBookings hook call
debug: true  // or process.env.NODE_ENV === 'development'
```

**Expected Console Logs:**
```
[useRealtimeBookings] Subscribing to channel: booking-updates:student:uuid
[useRealtimeBookings] Subscription status: SUBSCRIBED
[useRealtimeBookings] UPDATE event: { new: {...}, old: {...} }
[useRealtimeBookings] Connection state: connected
```

### Network Tab

Monitor WebSocket connections:
```
wss://your-project.supabase.co/realtime/v1/websocket
```

**Expected:**
- [x] WebSocket connection established
- [x] Status 101 Switching Protocols
- [x] Messages sent/received
- [x] No constant reconnections

### React DevTools

Check for memory leaks:
1. Open React DevTools Profiler
2. Navigate between pages 10 times
3. Check component mount/unmount

**Expected:**
- [ ] useRealtimeBookings unmounts properly
- [ ] No leaked subscriptions
- [ ] Memory usage stable

---

## Manual Testing Checklist

### Student Dashboard
- [ ] Connection indicator shows on load
- [ ] Approval notification works
- [ ] Rejection notification works
- [ ] Toast displays rejection note
- [ ] Booking moves to correct section
- [ ] Real-time updates without refresh
- [ ] Navigation cleanup works
- [ ] Multiple tabs work correctly

### Tutor Dashboard
- [ ] Connection indicator shows on load
- [ ] New booking notification works
- [ ] Badge count updates in real-time
- [ ] "View" action in toast works
- [ ] Multiple requests handled
- [ ] Status updates reflected
- [ ] Real-time updates without refresh
- [ ] Navigation cleanup works

### Connection Management
- [ ] Connecting state shows
- [ ] Connected state shows
- [ ] Disconnected state shows
- [ ] Error state shows
- [ ] Automatic reconnection works
- [ ] Connection survives page navigation
- [ ] No memory leaks

### Performance
- [ ] Updates < 2 seconds
- [ ] No UI freezing
- [ ] No console errors
- [ ] Smooth animations
- [ ] Toast notifications smooth
- [ ] Multiple updates handled

---

## Common Issues & Solutions

### Issue: "Cannot read property 'id' of undefined"

**Cause:** User object not loaded before subscription
**Solution:** Hook checks for userId before subscribing

### Issue: Updates not appearing

**Checks:**
1. Is Realtime enabled on booking_requests table?
2. Is connection indicator green?
3. Are you the correct user (student/tutor)?
4. Check browser console for errors
5. Verify subscription filter matches user ID

### Issue: Multiple notifications for same event

**Cause:** Multiple subscriptions active
**Solution:** Ensure cleanup function runs on unmount

### Issue: Connection keeps reconnecting

**Cause:** Network issues or auth token expired
**Solution:** Check network tab, verify Supabase credentials

---

## Success Criteria

✅ **Task 21 Complete When:**

1. **Student Dashboard:**
   - Real-time status updates work
   - Toast notifications appear
   - No manual refresh needed
   - Connection indicator functional

2. **Tutor Dashboard:**
   - New booking notifications work
   - Real-time request updates
   - Badge counts update automatically
   - Toast actions work

3. **Connection Management:**
   - Connection states display correctly
   - Automatic reconnection works
   - Cleanup prevents memory leaks
   - Survives navigation

4. **Performance:**
   - Updates within 2 seconds
   - No UI blocking
   - Handles multiple simultaneous updates
   - No console errors

5. **User Experience:**
   - Smooth, seamless updates
   - Clear visual feedback
   - No unexpected behavior
   - Works across sessions

---

## Next Steps

After testing completes:
1. Mark Task 21 as complete
2. Document any issues found
3. Proceed to Task 22: Form Validation and Error Handling
4. Deploy to staging for user testing

---

## Automated Test Examples

### Unit Test: useRealtimeBookings Hook

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings'

test('establishes connection for student role', async () => {
  const onUpdate = jest.fn()

  const { result } = renderHook(() => useRealtimeBookings({
    userRole: 'student',
    userId: 'test-user-id',
    onUpdate
  }))

  await waitFor(() => {
    expect(result.current.connectionState).toBe('connected')
  })
})
```

### Integration Test: Student Dashboard

```typescript
import { render, screen } from '@testing-library/react'
import StudentDashboardPage from '@/app/dashboard/student/page'

test('shows connection indicator', () => {
  render(<StudentDashboardPage />)

  expect(screen.getByTitle(/live updates/i)).toBeInTheDocument()
})
```

---

**Testing Status:** Ready for manual and automated testing
**Last Updated:** 2024-11-14
