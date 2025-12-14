import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRsvpRequest {
  messageIds: string[];
}

interface MessageWithDetails {
  id: string;
  event_player_id: string;
  template_id: string;
  channel: "email" | "sms";
  recipient: string;
  status: string;
  response_token: string;
  template: {
    subject: string | null;
    body: string;
  };
  event_player: {
    player: {
      name: string;
    };
    event: {
      date: string;
      course_name: string;
      first_tee_time: string;
      holes: number;
    };
  };
}

// Template variable substitution
function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  body: string,
  resendApiKey: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Golf League <noreply@retreatgolf.lovable.app>",
        to: [to],
        subject: subject,
        text: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, externalId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send SMS via Twilio
async function sendSms(
  to: string,
  body: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    // Format phone number (ensure it has country code)
    let formattedPhone = to.replace(/\D/g, "");
    if (!formattedPhone.startsWith("1") && formattedPhone.length === 10) {
      formattedPhone = "1" + formattedPhone;
    }
    formattedPhone = "+" + formattedPhone;

    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhoneNumber,
          Body: body,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    return { success: true, externalId: data.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const appUrl = Deno.env.get("APP_URL") || "https://retreatgolf.lovable.app";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageIds }: SendRsvpRequest = await req.json();

    if (!messageIds || messageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No message IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages with all related data
    const { data: messages, error: fetchError } = await supabase
      .from("rsvp_messages")
      .select(`
        id,
        event_player_id,
        template_id,
        channel,
        recipient,
        status,
        response_token,
        rsvp_templates (
          subject,
          body
        ),
        event_players (
          players (
            name
          ),
          events (
            date,
            course_name,
            first_tee_time,
            holes
          )
        )
      `)
      .in("id", messageIds)
      .eq("status", "pending");

    if (fetchError) {
      throw fetchError;
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const message of messages || []) {
      const template = message.rsvp_templates;
      const eventPlayer = message.event_players;

      if (!template || !eventPlayer) {
        results.failed++;
        results.errors.push(`Message ${message.id}: Missing template or event player data`);
        continue;
      }

      // Build template variables
      const variables: Record<string, string> = {
        player_name: eventPlayer.players?.name || "Player",
        event_date: new Date(eventPlayer.events?.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        course_name: eventPlayer.events?.course_name || "",
        first_tee_time: eventPlayer.events?.first_tee_time || "",
        holes: String(eventPlayer.events?.holes || 18),
        rsvp_link: `${appUrl}/rsvp/${message.response_token}`,
      };

      // Render the template
      const renderedBody = renderTemplate(template.body, variables);
      const renderedSubject = template.subject
        ? renderTemplate(template.subject, variables)
        : "Golf Event RSVP";

      let sendResult: { success: boolean; externalId?: string; error?: string };

      if (message.channel === "email") {
        if (!resendApiKey) {
          results.failed++;
          results.errors.push(`Message ${message.id}: Resend API key not configured`);
          continue;
        }
        sendResult = await sendEmail(
          message.recipient,
          renderedSubject,
          renderedBody,
          resendApiKey
        );
      } else {
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
          results.failed++;
          results.errors.push(`Message ${message.id}: Twilio not configured`);
          continue;
        }
        sendResult = await sendSms(
          message.recipient,
          renderedBody,
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber
        );
      }

      // Update message status
      const updateData = sendResult.success
        ? {
            status: "sent",
            sent_at: new Date().toISOString(),
            external_id: sendResult.externalId,
          }
        : {
            status: "failed",
            error_message: sendResult.error,
          };

      await supabase
        .from("rsvp_messages")
        .update(updateData)
        .eq("id", message.id);

      if (sendResult.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Message ${message.id}: ${sendResult.error}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
