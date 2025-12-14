import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Mail, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

interface RsvpManagerProps {
  eventId: string;
  event: Tables<"events">;
}

export const RsvpManager = ({ eventId, event }: RsvpManagerProps) => {
  const queryClient = useQueryClient();
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sendChannel, setSendChannel] = useState<"email" | "sms" | "both">("email");

  // Fetch event players with their contact info
  const { data: eventPlayers, isLoading: playersLoading } = useQuery({
    queryKey: ["event_players_rsvp", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_players")
        .select("*, players(*)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch RSVP message history for this event
  const { data: messageHistory } = useQuery({
    queryKey: ["rsvp_messages", eventId],
    queryFn: async () => {
      const eventPlayerIds = eventPlayers?.map(ep => ep.id) || [];
      if (eventPlayerIds.length === 0) return [];

      const { data, error } = await supabase
        .from("rsvp_messages")
        .select("*")
        .in("event_player_id", eventPlayerIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!eventPlayers && eventPlayers.length > 0,
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["rsvp_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rsvp_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get message history for a specific event_player
  const getLastMessage = (eventPlayerId: string) => {
    return messageHistory?.find(m => m.event_player_id === eventPlayerId);
  };

  // Send RSVP mutation
  const sendRsvpMutation = useMutation({
    mutationFn: async () => {
      const selectedEventPlayers = eventPlayers?.filter(ep => selectedPlayers.has(ep.id)) || [];

      if (selectedEventPlayers.length === 0) {
        throw new Error("No players selected");
      }

      const template = templates?.find(t => t.id === selectedTemplateId);
      if (!template) {
        throw new Error("Please select a template");
      }

      // Create message records for each selected player
      const messages = [];
      for (const ep of selectedEventPlayers) {
        const player = ep.players;

        // Check if player has required contact info
        if (sendChannel === "email" || sendChannel === "both") {
          if (player.email) {
            messages.push({
              event_player_id: ep.id,
              template_id: template.id,
              channel: "email" as const,
              recipient: player.email,
              status: "pending" as const,
            });
          }
        }

        if (sendChannel === "sms" || sendChannel === "both") {
          if (player.phone) {
            messages.push({
              event_player_id: ep.id,
              template_id: template.id,
              channel: "sms" as const,
              recipient: player.phone,
              status: "pending" as const,
            });
          }
        }
      }

      if (messages.length === 0) {
        throw new Error("No valid contact information for selected players");
      }

      // Insert message records
      const { data: insertedMessages, error: insertError } = await supabase
        .from("rsvp_messages")
        .insert(messages)
        .select();

      if (insertError) throw insertError;

      // Call the Edge Function to send the messages
      // Note: If the Edge Function is not deployed yet, this will fail gracefully
      // and messages will remain in "pending" status
      try {
        const { data: sendResult, error: sendError } = await supabase.functions.invoke("send-rsvp", {
          body: { messageIds: insertedMessages.map(m => m.id) },
        });

        if (sendError) {
          console.warn("Edge function not available, messages queued for manual processing:", sendError);
          // Update to "pending" status so user knows they need to configure the Edge Function
          toast.info("Messages queued. Configure Resend/Twilio to enable automatic sending.");
        }
      } catch (fnError) {
        console.warn("Edge function call failed:", fnError);
        // Messages remain in pending status
      }

      return insertedMessages.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["rsvp_messages", eventId] });
      toast.success(`Queued ${count} message(s) for delivery`);
      setSelectedPlayers(new Set());
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send RSVPs");
    },
  });

  const toggleSelectAll = () => {
    if (selectedPlayers.size === eventPlayers?.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(eventPlayers?.map(ep => ep.id) || []));
    }
  };

  const toggleSelectPlayer = (eventPlayerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(eventPlayerId)) {
      newSelected.delete(eventPlayerId);
    } else {
      newSelected.add(eventPlayerId);
    }
    setSelectedPlayers(newSelected);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPlayerRsvpStatus = (status: string) => {
    switch (status) {
      case "yes":
        return <Badge className="bg-green-500">Yes</Badge>;
      case "no":
        return <Badge variant="destructive">No</Badge>;
      case "waitlist":
        return <Badge variant="secondary">Waitlist</Badge>;
      default:
        return <Badge variant="outline">Invited</Badge>;
    }
  };

  const hasContactInfo = (player: any, channel: string) => {
    if (channel === "email") return !!player.email;
    if (channel === "sms") return !!player.phone;
    if (channel === "both") return !!player.email || !!player.phone;
    return false;
  };

  // Filter templates based on selected channel
  const filteredTemplates = templates?.filter(t =>
    t.channel === sendChannel || t.channel === "both"
  );

  if (playersLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Send RSVP Controls */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Send RSVP Invitations</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Channel</label>
            <Select value={sendChannel} onValueChange={(v: "email" | "sms" | "both") => setSendChannel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Only
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Only
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    Both
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates?.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.is_default && " (Default)"}
                  </SelectItem>
                ))}
                {(!filteredTemplates || filteredTemplates.length === 0) && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    No templates for this channel
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => sendRsvpMutation.mutate()}
              disabled={selectedPlayers.size === 0 || !selectedTemplateId || sendRsvpMutation.isPending}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Send to {selectedPlayers.size} Player{selectedPlayers.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>

        {selectedPlayers.size > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedPlayers.size} player{selectedPlayers.size !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Players Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPlayers.size === eventPlayers?.length && eventPlayers?.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>RSVP Status</TableHead>
              <TableHead>Last Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventPlayers?.map((ep) => {
              const player = ep.players;
              const lastMessage = getLastMessage(ep.id);
              const canSend = hasContactInfo(player, sendChannel);

              return (
                <TableRow key={ep.id} className={!canSend ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPlayers.has(ep.id)}
                      onCheckedChange={() => toggleSelectPlayer(ep.id)}
                      disabled={!canSend}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {player.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {player.email}
                        </div>
                      )}
                      {player.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {player.phone}
                        </div>
                      )}
                      {!player.email && !player.phone && (
                        <span className="text-muted-foreground italic">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPlayerRsvpStatus(ep.status)}</TableCell>
                  <TableCell>
                    {lastMessage ? (
                      <div className="flex items-center gap-2 text-sm">
                        {getStatusIcon(lastMessage.status)}
                        <span className="capitalize">{lastMessage.status}</span>
                        <span className="text-muted-foreground">
                          {lastMessage.sent_at && format(parseISO(lastMessage.sent_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never sent</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!eventPlayers || eventPlayers.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No players in this event yet. Add players from the Players tab.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info Box */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">How RSVP works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Select players and a template, then click Send</li>
          <li>Players will receive a message with a link to respond</li>
          <li>When they respond, their status will be automatically updated</li>
          <li>You can track delivery status in the "Last Message" column</li>
        </ul>
      </div>
    </div>
  );
};
