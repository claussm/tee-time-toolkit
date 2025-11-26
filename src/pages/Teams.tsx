import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { TeamDialog } from "@/components/TeamDialog";
import { TeamsTable } from "@/components/TeamsTable";
import { NavLink } from "@/components/NavLink";

export default function Teams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", showActiveOnly],
    queryFn: async () => {
      let query = supabase
        .from("player_teams")
        .select(`
          *,
          player_team_members (
            id,
            player_id,
            players (
              id,
              name
            )
          )
        `)
        .order("name");

      if (showActiveOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("player_teams")
        .update({ is_active: false })
        .eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team deactivated");
    },
  });

  const filteredTeams = teams?.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (teamId: string) => {
    deactivateMutation.mutate(teamId);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTeam(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-64"
          />
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            {showActiveOnly ? "Active Only" : "All Teams"}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="md:ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </div>

        <TeamsTable
          teams={filteredTeams || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
        />

      <TeamDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        team={editingTeam}
      />
    </div>
  );
}
