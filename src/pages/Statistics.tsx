import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Statistics() {
  const { data: playerStats, isLoading: loadingPlayers } = useQuery({
    queryKey: ["player-statistics"],
    queryFn: async () => {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name")
        .eq("is_active", true);
      if (playersError) throw playersError;

      const statsPromises = players.map(async (player) => {
        const { data: scores, error: scoresError } = await supabase
          .from("round_scores")
          .select("points")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(6);
        if (scoresError) throw scoresError;

        const totalPoints = scores.reduce((sum, s) => sum + Number(s.points), 0);
        const average = scores.length > 0 ? totalPoints / scores.length : 0;
        const roundsPlayed = scores.length;

        return {
          ...player,
          average: average.toFixed(2),
          roundsPlayed,
        };
      });

      const stats = await Promise.all(statsPromises);
      return stats.sort((a, b) => Number(b.average) - Number(a.average));
    },
  });

  const { data: teamStats, isLoading: loadingTeams } = useQuery({
    queryKey: ["team-statistics"],
    queryFn: async () => {
      const { data: teams, error: teamsError } = await supabase
        .from("player_teams")
        .select(`
          id,
          name,
          color,
          player_team_members (
            player_id
          )
        `)
        .eq("is_active", true);
      if (teamsError) throw teamsError;

      const teamStatsPromises = teams.map(async (team) => {
        const memberIds = team.player_team_members.map((m: any) => m.player_id);
        
        if (memberIds.length === 0) {
          return {
            ...team,
            average: "0.00",
            memberCount: 0,
          };
        }

        const memberAverages = await Promise.all(
          memberIds.map(async (playerId: string) => {
            const { data: scores } = await supabase
              .from("round_scores")
              .select("points")
              .eq("player_id", playerId)
              .order("created_at", { ascending: false })
              .limit(6);

            if (!scores || scores.length === 0) return 0;
            const total = scores.reduce((sum, s) => sum + Number(s.points), 0);
            return total / scores.length;
          })
        );

        const teamAverage = memberAverages.length > 0
          ? memberAverages.reduce((sum, avg) => sum + avg, 0) / memberAverages.length
          : 0;

        return {
          ...team,
          average: teamAverage.toFixed(2),
          memberCount: memberIds.length,
        };
      });

      const stats = await Promise.all(teamStatsPromises);
      return stats.sort((a, b) => Number(b.average) - Number(a.average));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Statistics</h1>
          </div>
          <nav className="flex gap-4">
            <NavLink to="/" className="text-muted-foreground hover:text-foreground">Events</NavLink>
            <NavLink to="/players" className="text-muted-foreground hover:text-foreground">Players</NavLink>
            <NavLink to="/teams" className="text-muted-foreground hover:text-foreground">Teams</NavLink>
            <NavLink to="/statistics" className="text-foreground font-medium border-b-2 border-primary">Statistics</NavLink>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Player Leaderboard</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              {loadingPlayers ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Rounds</TableHead>
                      <TableHead className="text-right">Avg Points (6)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerStats?.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{player.roundsPlayed}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {player.average}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Team Standings</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              {loadingTeams ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Team Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamStats?.map((team, index) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: team.color || "#3B82F6" }}
                            />
                            <span>{team.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{team.memberCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {team.average}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
