# Email Template System Documentation

## Overview

The email template system provides professionally designed, responsive HTML email templates for all booking-related notifications in the tutoring platform.

**Location**: `supabase/functions/_shared/email-templates.ts`

## Features

✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
✅ **Email Client Compatible** - Uses inline CSS for maximum compatibility
✅ **Professional Styling** - Branded colors and modern design
✅ **Plain Text Fallback** - Includes text version for all emails
✅ **Dynamic Content** - Easily customizable with booking data
✅ **Accessibility** - Semantic HTML and good contrast ratios

## Available Templates

### 1. New Booking Request Template

**Function**: `newBookingRequestTemplate(data: BookingEmailData)`

**Sent to**: Tutor
**When**: A student creates a new booking request
**Color Theme**: Indigo (#4F46E5)

**Includes**:
- Student name
- Subject and duration
- Requested date and time
- Special requests (if provided)
- Call-to-action button to view request

**Example**:
```typescript
const email = newBookingRequestTemplate({
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60,
  specificRequests: 'Focus on calculus please'
})

// Returns: { subject, html, text }
```

### 2. Booking Approved Template

**Function**: `bookingApprovedTemplate(data: BookingEmailData)`

**Sent to**: Student
**When**: Tutor approves a booking request
**Color Theme**: Green (#10B981)

**Includes**:
- Success message with celebration emoji
- Tutor name
- Confirmed session details
- Calendar information
- Link to view schedule
- Reminder notification notice

**Example**:
```typescript
const email = bookingApprovedTemplate({
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60
})
```

### 3. Booking Rejected Template

**Function**: `bookingRejectedTemplate(data: BookingEmailData)`

**Sent to**: Student
**When**: Tutor rejects a booking request
**Color Theme**: Red (#EF4444)

**Includes**:
- Polite rejection message
- Original booking details
- Rejection note from tutor (if provided)
- Call-to-action to book another session
- Encouragement to try different time

**Example**:
```typescript
const email = bookingRejectedTemplate({
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60,
  rejectionNote: 'Sorry, I have a conflict at this time'
})
```

### 4. Session Reminder Template

**Function**: `sessionReminderTemplate(data: BookingEmailData, recipientType: 'student' | 'tutor')`

**Sent to**: Both student and tutor
**When**: 24 hours before a scheduled session
**Color Theme**: Amber (#F59E0B)

**Includes**:
- Friendly reminder message
- Session details
- Other participant's name
- Student's special requests (tutor version only)
- Link to dashboard

**Example**:
```typescript
// For student
const studentEmail = sessionReminderTemplate({
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60
}, 'student')

// For tutor
const tutorEmail = sessionReminderTemplate({
  tutorName: 'Dr. Sarah Johnson',
  studentName: 'Alex Chen',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60,
  specificRequests: 'Focus on derivatives'
}, 'tutor')
```

## Data Interface

```typescript
interface BookingEmailData {
  tutorName: string        // Full name of the tutor
  studentName: string      // Full name of the student
  subject: string          // Subject (e.g., 'mathematics', 'chemistry')
  startTime: string        // ISO 8601 datetime string
  endTime: string          // ISO 8601 datetime string
  duration: number         // Duration in minutes (30, 60, or 120)
  specificRequests?: string  // Optional student requests
  rejectionNote?: string    // Optional rejection reason
}
```

## Template Structure

All templates follow this consistent structure:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* Inline CSS for email client compatibility */
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header with color-coded theme -->
      <div class="header">
        <h1>Email Title</h1>
      </div>

      <!-- Content area -->
      <div class="content">
        <p>Greeting and message</p>

        <!-- Booking details card -->
        <div class="details">
          <div class="detail-row">...</div>
        </div>

        <!-- Call to action button -->
        <p style="text-align: center;">
          <a href="..." class="button">Action</a>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Automated email notice</p>
      </div>
    </div>
  </body>
</html>
```

## Styling Guidelines

### Colors

- **Primary Brand**: #4F46E5 (Indigo)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)
- **Text**: #333333 (Dark Gray)
- **Muted**: #6B7280 (Gray)
- **Background**: #F9FAFB (Light Gray)

### Typography

- **Font**: Arial, sans-serif (universally supported)
- **Line Height**: 1.6
- **Heading Size**: 24-32px
- **Body Size**: 14-16px
- **Small Text**: 12-14px

### Layout

- **Max Width**: 600px (optimal for all devices)
- **Padding**: 20-30px
- **Border Radius**: 4-8px
- **Button Padding**: 12px 24px

## Testing Templates

### Local Preview

Use the test function to preview templates:

```bash
# Start local Supabase
supabase start

# Serve the test function
supabase functions serve test-email-templates

# Open in browser
http://127.0.0.1:54321/functions/v1/test-email-templates/preview?templateType=approved
```

### Email Client Testing

Test templates in various email clients:

1. **Gmail** (Web and mobile)
2. **Outlook** (Desktop and web)
3. **Apple Mail** (macOS and iOS)
4. **Yahoo Mail**
5. **Mobile devices** (iOS and Android)

### Recommended Testing Tools

- [Litmus](https://litmus.com/) - Email client testing
- [Email on Acid](https://www.emailonacid.com/) - Cross-client testing
- [Mailtrap](https://mailtrap.io/) - Email testing environment
- Browser DevTools - Mobile responsive testing

## Customization

### Changing Colors

Update the color values in the inline styles:

```typescript
// Example: Change header color
.header { background-color: #YOUR_COLOR; color: white; }
```

### Adding New Fields

1. Update the `BookingEmailData` interface
2. Modify template functions to include new fields
3. Update all template variations

### Creating New Templates

Follow the existing pattern:

```typescript
export function newTemplate(data: BookingEmailData): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: 'Your Subject Line',
    html: `
      <!DOCTYPE html>
      <html>
        <!-- Your HTML -->
      </html>
    `,
    text: `
      Plain text version
    `.trim()
  }
}
```

## Email Client Compatibility

### Supported Features

✅ Inline CSS
✅ Web fonts (with fallbacks)
✅ Responsive design
✅ Background colors
✅ Border radius
✅ Padding and margins

### Not Supported (Use Fallbacks)

❌ External CSS files
❌ JavaScript
❌ CSS Grid (use tables)
❌ Flexbox (limited support)
❌ Custom fonts without fallbacks

## Best Practices

1. **Always use inline CSS** - External stylesheets are blocked by most email clients
2. **Include plain text version** - For accessibility and spam filters
3. **Use absolute URLs** - For images and links
4. **Test before deploying** - Verify in multiple email clients
5. **Keep it simple** - Complex layouts may break in some clients
6. **Use tables for layout** - Better email client support than divs
7. **Optimize images** - Use appropriate file sizes
8. **Include alt text** - For images and accessibility
9. **Provide unsubscribe option** - For transactional emails
10. **Use clear CTAs** - Make action buttons obvious

## Performance

- **HTML Size**: ~5-10KB per template
- **Load Time**: Instant (inline CSS)
- **Rendering**: Fast in all modern email clients
- **Mobile**: Fully responsive

## Future Enhancements

Potential improvements:

- [ ] Multi-language support
- [ ] Dark mode variants
- [ ] Calendar invite attachments (.ics files)
- [ ] Dynamic branding (logo, colors)
- [ ] A/B testing capabilities
- [ ] Email analytics tracking
- [ ] Template versioning
- [ ] User preference customization

## Troubleshooting

### Common Issues

**Images not displaying**
- Ensure using absolute URLs
- Check image file sizes
- Verify CORS settings

**Layout broken in Outlook**
- Use tables instead of divs for layout
- Avoid flexbox and grid
- Test with conditional comments

**Buttons not clickable**
- Ensure proper padding
- Use `display: inline-block`
- Check z-index conflicts

**Text too small on mobile**
- Use `font-size: 16px` minimum
- Add viewport meta tag
- Test on actual devices

## Support

For questions or issues with email templates:

1. Check this documentation
2. Test with the preview function
3. Review email client compatibility
4. Consult email design resources:
   - [Really Good Emails](https://reallygoodemails.com/)
   - [HTML Email Guide](https://www.htmlemailcheck.com/knowledge-base/)
   - [Can I Email](https://www.caniemail.com/)

---

**Last Updated**: Task 16 - Email Template System
**Version**: 1.0.0
**Status**: Production Ready
