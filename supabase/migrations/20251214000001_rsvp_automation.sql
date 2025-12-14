-- Add email column back to players table for RSVP functionality
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS email TEXT;

-- Create RSVP templates table
CREATE TABLE public.rsvp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT, -- for email messages
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RSVP messages log table
CREATE TABLE public.rsvp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_player_id UUID NOT NULL REFERENCES public.event_players(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.rsvp_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL, -- email address or phone number
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  response_token UUID UNIQUE DEFAULT gen_random_uuid(), -- for tracking RSVP clicks
  external_id TEXT, -- ID from email/SMS provider (Resend/Twilio)
  error_message TEXT, -- store error details if failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RSVP settings table for storing API keys and configuration
CREATE TABLE public.rsvp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.rsvp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_settings ENABLE ROW LEVEL SECURITY;

-- Policies for rsvp_templates (admins can manage, all authenticated can read)
CREATE POLICY "Admins can manage rsvp_templates"
ON public.rsvp_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view rsvp_templates"
ON public.rsvp_templates
FOR SELECT
TO authenticated
USING (true);

-- Policies for rsvp_messages (admins only)
CREATE POLICY "Admins can manage rsvp_messages"
ON public.rsvp_messages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow public access to rsvp_messages for response tracking (by token only)
CREATE POLICY "Public can read messages by token"
ON public.rsvp_messages
FOR SELECT
TO anon
USING (response_token IS NOT NULL);

-- Policies for rsvp_settings (admins only)
CREATE POLICY "Admins can manage rsvp_settings"
ON public.rsvp_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_rsvp_messages_event_player_id ON public.rsvp_messages(event_player_id);
CREATE INDEX idx_rsvp_messages_response_token ON public.rsvp_messages(response_token);
CREATE INDEX idx_rsvp_messages_status ON public.rsvp_messages(status);
CREATE INDEX idx_rsvp_templates_is_default ON public.rsvp_templates(is_default);

-- Trigger for updated_at on rsvp_templates
CREATE TRIGGER update_rsvp_templates_updated_at
  BEFORE UPDATE ON public.rsvp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on rsvp_settings
CREATE TRIGGER update_rsvp_settings_updated_at
  BEFORE UPDATE ON public.rsvp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default RSVP templates
INSERT INTO public.rsvp_templates (name, subject, body, channel, is_default) VALUES
(
  'Default Email Invitation',
  'Golf Event RSVP - {{event_date}} at {{course_name}}',
  E'Hi {{player_name}},\n\nYou are invited to join us for golf on {{event_date}} at {{course_name}}.\n\nFirst tee time: {{first_tee_time}}\nHoles: {{holes}}\n\nPlease let us know if you can make it:\n\n{{rsvp_link}}\n\nSee you on the course!',
  'email',
  true
),
(
  'Default SMS Invitation',
  NULL,
  'Hi {{player_name}}! Golf on {{event_date}} at {{course_name}}, {{first_tee_time}}. Can you make it? Reply YES or NO, or click: {{rsvp_link}}',
  'sms',
  true
),
(
  'Reminder Email',
  'Reminder: Golf Event Tomorrow - {{course_name}}',
  E'Hi {{player_name}},\n\nJust a reminder that we have golf tomorrow at {{course_name}}.\n\nDate: {{event_date}}\nFirst tee time: {{first_tee_time}}\n\nIf you haven''t responded yet, please do so:\n{{rsvp_link}}\n\nSee you there!',
  'email',
  false
);
