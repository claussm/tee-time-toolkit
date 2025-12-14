# RSVP Automation Setup Guide

This guide walks you through setting up the RSVP automation feature, including email and SMS messaging.

## Overview

The RSVP system allows you to:
- Create message templates for invitations
- Send email and/or SMS invitations to players
- Track message delivery status
- Collect player responses via a simple web link

## Prerequisites

- A Supabase project with Edge Functions enabled
- Resend account for email (optional)
- Twilio account for SMS (optional)

---

## Step 1: Run the Database Migration

The migration file is already in `supabase/migrations/20251214000001_rsvp_automation.sql`.

If you're using Supabase locally:
```bash
supabase db push
```

If using the Supabase dashboard:
1. Go to SQL Editor
2. Copy the contents of the migration file
3. Run the SQL

---

## Step 2: Configure Email (Resend)

### Create a Resend Account

1. Go to [resend.com](https://resend.com) and create an account
2. Verify your email domain or use Resend's testing domain
3. Generate an API key from the dashboard

### Add Resend to Supabase

In your Supabase project dashboard:

1. Go to **Project Settings > Edge Functions**
2. Add the following secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)

Or via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Customize the "From" Address

In `supabase/functions/send-rsvp/index.ts`, update line 54:
```typescript
from: "Golf League <noreply@yourdomain.com>",
```

**Note:** You must verify your domain in Resend to use a custom "from" address.

---

## Step 3: Configure SMS (Twilio)

### Create a Twilio Account

1. Go to [twilio.com](https://www.twilio.com) and create an account
2. Complete the verification process
3. Get a phone number with SMS capability
4. Find your Account SID and Auth Token in the dashboard

### Add Twilio to Supabase

In your Supabase project dashboard:

1. Go to **Project Settings > Edge Functions**
2. Add the following secrets:
   - `TWILIO_ACCOUNT_SID`: Your Account SID (starts with `AC`)
   - `TWILIO_AUTH_TOKEN`: Your Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number (e.g., `+18435551234`)

Or via CLI:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+18435551234
```

### Phone Number Format

The system automatically formats US phone numbers. Ensure player phone numbers in your database are in a standard format (e.g., `(843) 555-1234` or `843-555-1234`).

---

## Step 4: Deploy the Edge Function

### Using Supabase CLI

```bash
cd your-project-directory
supabase functions deploy send-rsvp
```

### Set the App URL

The system needs to know your app's URL to generate RSVP response links:

```bash
supabase secrets set APP_URL=https://your-app-url.com
```

---

## Step 5: Test the Setup

1. Go to the **RSVP Templates** page and verify templates exist
2. Navigate to an event's detail page
3. Click on the **RSVP** tab
4. Select players with email/phone contact info
5. Choose a template and send

### Troubleshooting

**Messages stuck in "pending" status:**
- Check that the Edge Function is deployed
- Verify the API keys are set correctly
- Check the Edge Function logs in Supabase dashboard

**Emails not delivering:**
- Verify your domain in Resend
- Check the "from" address matches a verified domain
- Look for bounces in the Resend dashboard

**SMS not sending:**
- Verify your Twilio account is active (not in trial mode if sending to unverified numbers)
- Check the phone number format
- Review Twilio logs for errors

---

## Cost Estimates

### Resend (Email)
- **Free tier**: 100 emails/day, 3,000/month
- **Pro plan**: $20/month for 50,000 emails

### Twilio (SMS)
- **Pay-as-you-go**: ~$0.0079 per SMS segment
- For 50 players: ~$0.40 per event
- Phone number: ~$1.15/month

### Supabase Edge Functions
- **Free tier**: 500,000 invocations/month
- More than enough for RSVP automation

---

## Template Variables

When creating templates, you can use these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{player_name}}` | Player's name | "John Smith" |
| `{{event_date}}` | Formatted event date | "Saturday, December 21" |
| `{{course_name}}` | Golf course name | "Barefoot Resort - Dye Course" |
| `{{first_tee_time}}` | First tee time | "8:00 AM" |
| `{{holes}}` | Number of holes | "18" |
| `{{rsvp_link}}` | Response link | Full URL to RSVP page |

### Example Email Template

**Subject:** Golf Event RSVP - {{event_date}} at {{course_name}}

**Body:**
```
Hi {{player_name}},

You're invited to join us for golf on {{event_date}} at {{course_name}}.

First tee time: {{first_tee_time}}
Holes: {{holes}}

Please let us know if you can make it by clicking one of the links below:

{{rsvp_link}}

See you on the course!
```

### Example SMS Template

```
Hi {{player_name}}! Golf on {{event_date}} at {{course_name}}, {{first_tee_time}}. Can you make it? {{rsvp_link}}
```

**Tip:** Keep SMS messages under 160 characters for best delivery rates.

---

## Security Notes

- RSVP response tokens are unique UUIDs that cannot be guessed
- Each player gets their own response link
- Response links are valid indefinitely but can only update the player's own status
- The Edge Function uses a service role key with full database access

---

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify all environment variables are set
3. Test with a single player first before bulk sending
