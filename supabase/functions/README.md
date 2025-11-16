# Supabase Edge Functions

This directory contains Supabase Edge Functions for the tutoring platform.

## Structure

```
supabase/functions/
├── _shared/               # Shared utilities and helpers
│   ├── supabase.ts       # Supabase client configuration
│   ├── cors.ts           # CORS headers helper
│   └── email-templates.ts # Email template system
├── send-booking-notification/  # Email notification function
│   └── index.ts
├── deno.json             # Deno configuration
└── .env.example          # Environment variables template
```

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for server-side operations
- `NEXT_PUBLIC_APP_URL`: Your application URL (e.g., http://localhost:3000)

### 3. Start Local Development

```bash
# Start Supabase local development
supabase start

# Serve a specific function locally
supabase functions serve send-booking-notification --env-file supabase/functions/.env
```

## Available Functions

### send-booking-notification

Sends email notifications for booking-related events:
- New booking requests (sent to tutors)
- Booking approvals (sent to students)
- Booking rejections (sent to students)
- Session reminders (sent to both)

**Endpoint**: `/functions/v1/send-booking-notification`

**Payload**:
```json
{
  "type": "new_request" | "approved" | "rejected" | "reminder",
  "bookingId": "uuid",
  "recipientEmail": "user@example.com"
}
```

## Email Templates

Email templates are defined in `_shared/email-templates.ts`:

- `newBookingRequestTemplate()` - New booking request notification
- `bookingApprovedTemplate()` - Booking approval notification
- `bookingRejectedTemplate()` - Booking rejection notification
- `sessionReminderTemplate()` - Session reminder (24h before)

All templates include:
- HTML version (styled with inline CSS)
- Plain text version (fallback)
- Responsive design
- Action buttons linking back to the app

## Deployment

### Deploy to Supabase

```bash
# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy send-booking-notification
```

### Set Environment Variables in Production

```bash
# Set environment secrets
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
supabase secrets set NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Testing

### Test Locally

```bash
# Using curl
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-booking-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "new_request",
    "bookingId": "123e4567-e89b-12d3-a456-426614174000",
    "recipientEmail": "test@example.com"
  }'
```

## Shared Utilities

### Supabase Client

```typescript
import { createSupabaseClient } from '../_shared/supabase.ts'

const supabase = createSupabaseClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```

### CORS Handling

```typescript
import { handleCors, corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Your function logic...

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

### Email Templates

```typescript
import { newBookingRequestTemplate } from '../_shared/email-templates.ts'

const emailContent = newBookingRequestTemplate({
  tutorName: 'John Doe',
  studentName: 'Jane Smith',
  subject: 'mathematics',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  duration: 60,
  specificRequests: 'Please focus on calculus'
})

// Send email using your email provider
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Make sure you're including CORS headers in all responses
2. **Environment variables not loading**: Check that `.env` file exists in `supabase/functions/`
3. **Deno import errors**: Ensure you're using JSR imports (e.g., `jsr:@supabase/supabase-js@2`)

### Logs

View function logs:
```bash
supabase functions logs send-booking-notification
```

## Future Enhancements

- [ ] Integrate with email provider (Resend, SendGrid, or AWS SES)
- [ ] Add retry logic for failed email sends
- [ ] Implement email delivery tracking
- [ ] Add email preferences/unsubscribe functionality
- [ ] Support multiple languages for email templates
