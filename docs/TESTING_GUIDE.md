# Testing Guide - Class Scheduler

Comprehensive testing guide for all features and user flows.

---

## Manual Testing Checklist

### Authentication Flow

**Student Signup**
- [ ] Navigate to `/auth/signup`
- [ ] Fill form with valid data
- [ ] Submit form
- [ ] Verify account created
- [ ] Check email received
- [ ] Verify redirect to dashboard

**Tutor Signup**
- [ ] Navigate to `/auth/signup`
- [ ] Select "Tutor" role
- [ ] Fill form with valid data
- [ ] Submit form
- [ ] Verify account created
- [ ] Verify redirect to dashboard

**Login**
- [ ] Navigate to `/auth/login`
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify redirect to dashboard
- [ ] Check user role is correct

**Password Validation**
- [ ] Try weak password (< 8 chars)
- [ ] Verify error message appears
- [ ] Try password without uppercase
- [ ] Verify error message appears
- [ ] Try valid password
- [ ] Verify validation passes

---

## Student Features

### Browse Tutors
- [ ] Navigate to `/dashboard/student/browse`
- [ ] Verify tutor list loads
- [ ] Check tutor profiles display correctly
- [ ] Test subject filtering
- [ ] Verify "Book Session" button works

### Book Session
- [ ] Select a tutor
- [ ] Choose subject
- [ ] Select duration (30/60/120 min)
- [ ] Pick a date
- [ ] Select available time slot
- [ ] Add specific requests (optional)
- [ ] Submit booking request
- [ ] Verify success toast appears
- [ ] Check booking appears in "Pending Requests"

### My Bookings Dashboard
- [ ] Navigate to `/dashboard/student`
- [ ] Verify upcoming sessions display
- [ ] Check pending requests show
- [ ] Verify past bookings in history
- [ ] Test real-time updates (have tutor approve)
- [ ] Verify toast notification on status change

---

## Tutor Features

### Manage Availability
- [ ] Navigate to `/dashboard/tutor/availability`
- [ ] Add new availability slot
- [ ] Verify slot appears in calendar
- [ ] Edit existing slot
- [ ] Delete availability slot
- [ ] Add blocked time
- [ ] Verify blocked times prevent bookings

### Booking Requests
- [ ] Navigate to `/dashboard/tutor/requests`
- [ ] Verify pending requests display
- [ ] Click "View Details" on request
- [ ] Approve a booking
- [ ] Verify status updates
- [ ] Check student receives notification
- [ ] Reject a booking with note
- [ ] Verify rejection note sent to student

### Tutor Dashboard
- [ ] Navigate to `/dashboard/tutor`
- [ ] Verify upcoming sessions display
- [ ] Check approved bookings show
- [ ] Test real-time updates (new booking)
- [ ] Verify toast notification appears

---

## Real-time Features

### Student Dashboard Updates
- [ ] Open student dashboard
- [ ] Have tutor approve booking (different browser)
- [ ] Verify toast notification appears
- [ ] Check booking moves to "Upcoming Sessions"
- [ ] Verify no page refresh needed

### Tutor Dashboard Updates
- [ ] Open tutor dashboard
- [ ] Submit new booking as student
- [ ] Verify toast notification appears
- [ ] Check new request in pending tab
- [ ] Verify badge count updates

### Connection Indicator
- [ ] Check connection indicator shows "Connected"
- [ ] Disable network in DevTools
- [ ] Verify indicator shows "Disconnected"
- [ ] Re-enable network
- [ ] Verify automatic reconnection

---

## Form Validation

### Real-time Validation
- [ ] Start typing in email field
- [ ] Type invalid email
- [ ] Wait 300ms (debounce)
- [ ] Verify error message appears
- [ ] Type valid email
- [ ] Verify checkmark appears

### Password Strength
- [ ] Type weak password
- [ ] Verify strength indicator shows "Weak"
- [ ] Add complexity (uppercase, number)
- [ ] Verify indicator updates
- [ ] Check requirements checklist updates

### Character Limits
- [ ] Type in "Specific Requests" field
- [ ] Exceed 500 character limit
- [ ] Verify count turns red
- [ ] Verify over-limit message appears

---

## Error Handling

### Network Errors
- [ ] Disable network
- [ ] Try to submit form
- [ ] Verify "Connection Error" toast
- [ ] Verify retry button (if retryable)

### Authentication Errors
- [ ] Try login with wrong password
- [ ] Verify "Authentication Error" toast
- [ ] Check user-friendly message

### Error Boundary
- [ ] Trigger component error (simulate)
- [ ] Verify fallback UI appears
- [ ] Click "Try Again" button
- [ ] Verify component reloads

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Navigate site using Tab key only
- [ ] Verify all interactive elements focusable
- [ ] Check focus indicators visible
- [ ] Test Enter/Space activation
- [ ] Verify modal focus trapping

### Screen Reader
- [ ] Use screen reader (NVDA/VoiceOver)
- [ ] Navigate main menu
- [ ] Verify ARIA labels announced
- [ ] Check form labels read correctly
- [ ] Test error message announcements

### Mobile Responsiveness
- [ ] Test on mobile device (or DevTools)
- [ ] Verify mobile navigation works
- [ ] Check form fields sized correctly
- [ ] Test touch interactions
- [ ] Verify no horizontal scroll

---

## Performance Testing

### Loading States
- [ ] Navigate between pages
- [ ] Verify skeleton loaders appear
- [ ] Check smooth transitions
- [ ] Test loading indicators on buttons

### Page Load Speed
- [ ] Clear cache
- [ ] Load homepage
- [ ] Measure time to interactive (< 3s)
- [ ] Check Lighthouse score (> 90)

---

## Email Notifications

### Student Emails
- [ ] Sign up
- [ ] Verify welcome email received
- [ ] Submit booking request
- [ ] Check confirmation email
- [ ] Wait for tutor approval
- [ ] Verify approval email received

### Tutor Emails
- [ ] New booking submitted
- [ ] Verify notification email received
- [ ] Check email contains booking details
- [ ] Verify link to dashboard works

---

## Time Zone Testing

### Different Time Zones
- [ ] Set browser to UTC
- [ ] Create booking at 2:00 PM UTC
- [ ] Change browser to EST (UTC-5)
- [ ] Verify booking shows 9:00 AM EST
- [ ] Check time zone displayed correctly

---

## Cross-Browser Testing

### Browsers to Test
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Features to Verify
- [ ] Authentication works
- [ ] Forms submit correctly
- [ ] Real-time updates work
- [ ] Modals display properly
- [ ] Responsive design works

---

## Security Testing

### RLS Policies
- [ ] Student can only see own bookings
- [ ] Student cannot view other student data
- [ ] Tutor can only see assigned bookings
- [ ] Tutor cannot modify other tutor data

### Input Validation
- [ ] Try SQL injection in forms
- [ ] Verify inputs sanitized
- [ ] Test XSS attempts
- [ ] Verify no code execution

---

## Automated Testing

### Run Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- booking-form.test.tsx
```

### Expected Results
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage > 80%
- [ ] No console errors

---

## Production Smoke Tests

After deployment, run these quick tests:

1. [ ] Homepage loads
2. [ ] Can sign up
3. [ ] Can log in
4. [ ] Can create booking
5. [ ] Emails deliver
6. [ ] Real-time updates work
7. [ ] No console errors

---

## Bug Report Template

When reporting bugs, include:

```
**Bug Title:** Brief description

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Environment:**
- Browser: Chrome 120
- Device: Desktop/Mobile
- OS: Windows 11 / macOS

**Screenshots:**
(attach if applicable)

**Console Errors:**
(paste console errors if any)
```

---

## Test Data

### Test Accounts

**Student Account:**
- Email: `student@test.com`
- Password: `Test1234!`

**Tutor Account:**
- Email: `tutor@test.com`
- Password: `Test1234!`

---

**Testing Status:** Comprehensive ✅
