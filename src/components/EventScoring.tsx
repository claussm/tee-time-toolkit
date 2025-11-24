import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface EventScoringProps {
  eventId: string;
}

export function EventScoring({ eventId }: EventScoringProps) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});

  const { data: playingPlayers } = useQuery({
    queryKey: ["event-players-playing", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_players")
        .select(`
          player_id,
          players (
            id,
            name,
            default_team_id,
            player_teams!players_default_team_id_fkey (
              name,
              color
            )
          )
        `)
        .eq("event_id", eventId)
        .eq("status", "playing");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingScores } = useQuery({
    queryKey: ["round-scores", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("round_scores")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });

  const { data: playerAverages } = useQuery({
    queryKey: ["player-averages", playingPlayers],
    queryFn: async () => {
      if (!playingPlayers) return {};
      
      const averages: Record<string, number> = {};
      await Promise.all(
        playingPlayers.map(async (ep: any) => {
          const { data } = await supabase
            .from("round_scores")
            .select("points")
            .eq("player_id", ep.player_id)
            .order("created_at", { ascending: false })
            .limit(6);
          
          if (data && data.length > 0) {
            const total = data.reduce((sum, s) => sum + Number(s.points), 0);
            averages[ep.player_id] = total / data.length;
          } else {
            averages[ep.player_id] = 0;
          }
        })
      );
      return averages;
    },
    enabled: !!playingPlayers,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const scoresToSave = Object.entries(scores)
        .filter(([_, points]) => points.trim() !== "")
        .map(([playerId, points]) => ({
          event_id: eventId,
          player_id: playerId,
          points: parseFloat(points),
        }));

      if (scoresToSave.length === 0) {
        throw new Error("No scores to save");
      }

      // Delete existing scores for this event first
      await supabase.from("round_scores").delete().eq("event_id", eventId);

      // Insert new scores
      const { error } = await supabase.from("round_scores").insert(scoresToSave);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["round-scores"] });
      queryClient.invalidateQueries({ queryKey: ["player-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["team-statistics"] });
      toast.success("Scores saved successfully");
      setScores({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save scores");
    },
  });

  const handleScoreChange = (playerId: string, value: string) => {
    setScores((prev) => ({ ...prev, [playerId]: value }));
  };

  const getExistingScore = (playerId: string) => {
    return existingScores?.find((s) => s.player_id === playerId)?.points || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Enter Points for Playing Members</h3>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save All Scores"}
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>6-Round Avg</TableHead>
              <TableHead>Current Score</TableHead>
              <TableHead className="w-32">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playingPlayers?.map((ep: any) => {
              const player = ep.players;
              const team = player.player_teams;
              const average = playerAverages?.[player.id] || 0;
              const existingScore = getExistingScore(player.id);

              return (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    {team ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="text-sm">{team.name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{average.toFixed(2)}</Badge>
                  </TableCell>
                  <TableCell>
                    {existingScore && (
                      <Badge variant="secondary">{existingScore}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="0.0"
                      value={scores[player.id] || ""}
                      onChange={(e) => handleScoreChange(player.id, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
