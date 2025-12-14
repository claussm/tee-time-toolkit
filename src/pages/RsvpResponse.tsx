import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Calendar, MapPin, Clock, Loader2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface RsvpData {
  playerName: string;
  eventDate: string;
  courseName: string;
  firstTeeTime: string;
  holes: number;
  currentStatus: string;
  eventPlayerId: string;
  messageId: string;
}

const RsvpResponse = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvpData, setRsvpData] = useState<RsvpData | null>(null);
  const [responded, setResponded] = useState(false);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRsvpData() {
      if (!token) {
        setError("Invalid RSVP link");
        setLoading(false);
        return;
      }

      try {
        // Fetch the message by response token
        const { data: message, error: messageError } = await supabase
          .from("rsvp_messages")
          .select(`
            id,
            event_player_id,
            responded_at,
            event_players (
              id,
              status,
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
          .eq("response_token", token)
          .maybeSingle();

        if (messageError) throw messageError;

        if (!message) {
          setError("RSVP not found. This link may have expired or is invalid.");
          setLoading(false);
          return;
        }

        const eventPlayer = message.event_players;
        if (!eventPlayer) {
          setError("Event information not found.");
          setLoading(false);
          return;
        }

        // Check if already responded
        if (message.responded_at) {
          setResponded(true);
          setResponseStatus(eventPlayer.status);
        }

        setRsvpData({
          playerName: eventPlayer.players?.name || "Player",
          eventDate: eventPlayer.events?.date || "",
          courseName: eventPlayer.events?.course_name || "",
          firstTeeTime: eventPlayer.events?.first_tee_time || "",
          holes: eventPlayer.events?.holes || 18,
          currentStatus: eventPlayer.status,
          eventPlayerId: eventPlayer.id,
          messageId: message.id,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load RSVP data");
      } finally {
        setLoading(false);
      }
    }

    fetchRsvpData();
  }, [token]);

  const handleResponse = async (response: "yes" | "no") => {
    if (!rsvpData) return;

    setSubmitting(true);
    try {
      // Update event_player status
      const { error: updateError } = await supabase
        .from("event_players")
        .update({ status: response })
        .eq("id", rsvpData.eventPlayerId);

      if (updateError) throw updateError;

      // Mark message as responded
      await supabase
        .from("rsvp_messages")
        .update({ responded_at: new Date().toISOString() })
        .eq("id", rsvpData.messageId);

      setResponded(true);
      setResponseStatus(response);
    } catch (err: any) {
      setError(err.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading RSVP...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Unable to Load RSVP</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!rsvpData) {
    return null;
  }

  const formattedDate = rsvpData.eventDate
    ? format(parseISO(rsvpData.eventDate + "T00:00:00"), "EEEE, MMMM d, yyyy")
    : "";

  if (responded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {responseStatus === "yes" ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <CardTitle>
              {responseStatus === "yes" ? "You're In!" : "Thanks for letting us know"}
            </CardTitle>
            <CardDescription>
              {responseStatus === "yes"
                ? `We'll see you at ${rsvpData.courseName} on ${formattedDate}!`
                : "We hope to see you at a future event."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{rsvpData.courseName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>First tee: {rsvpData.firstTeeTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Golf RSVP</CardTitle>
          <CardDescription>Hi {rsvpData.playerName}, can you make it?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{formattedDate}</p>
                <p className="text-sm text-muted-foreground">{rsvpData.holes} holes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <p className="font-medium">{rsvpData.courseName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <p className="font-medium">First tee: {rsvpData.firstTeeTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              className="h-20 text-lg bg-green-600 hover:bg-green-700"
              onClick={() => handleResponse("yes")}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="mr-2 h-6 w-6" />
                  Yes, I'm in!
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-20 text-lg border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleResponse("no")}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <XCircle className="mr-2 h-6 w-6" />
                  Can't make it
                </>
              )}
            </Button>
          </div>

          {rsvpData.currentStatus !== "invited" && (
            <p className="text-center text-sm text-muted-foreground">
              Your current response: <span className="font-medium capitalize">{rsvpData.currentStatus}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RsvpResponse;
