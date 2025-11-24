import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: any;
}

export function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      memberIds: [] as string[],
    },
  });

  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const memberIds = watch("memberIds");

  useEffect(() => {
    if (team) {
      setValue("name", team.name);
      setValue("description", team.description || "");
      setValue("color", team.color || "#3B82F6");
      const existingMembers = team.player_team_members?.map((m: any) => m.player_id) || [];
      setValue("memberIds", existingMembers);
    } else {
      reset();
    }
  }, [team, reset, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (team) {
        const { error: updateError } = await supabase
          .from("player_teams")
          .update({
            name: values.name,
            description: values.description,
            color: values.color,
          })
          .eq("id", team.id);
        if (updateError) throw updateError;

        // Delete existing members
        await supabase
          .from("player_team_members")
          .delete()
          .eq("team_id", team.id);

        // Insert new members
        if (values.memberIds.length > 0) {
          const membersToInsert = values.memberIds.map((playerId: string) => ({
            team_id: team.id,
            player_id: playerId,
          }));
          const { error: membersError } = await supabase
            .from("player_team_members")
            .insert(membersToInsert);
          if (membersError) throw membersError;
        }
      } else {
        const { data: newTeam, error: insertError } = await supabase
          .from("player_teams")
          .insert({
            name: values.name,
            description: values.description,
            color: values.color,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // Insert members
        if (values.memberIds.length > 0) {
          const membersToInsert = values.memberIds.map((playerId: string) => ({
            team_id: newTeam.id,
            player_id: playerId,
          }));
          const { error: membersError } = await supabase
            .from("player_team_members")
            .insert(membersToInsert);
          if (membersError) throw membersError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(team ? "Team updated" : "Team created");
      onOpenChange(false);
      reset();
    },
  });

  const toggleMember = (playerId: string) => {
    const current = memberIds || [];
    if (current.includes(playerId)) {
      setValue("memberIds", current.filter(id => id !== playerId));
    } else {
      setValue("memberIds", [...current, playerId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Add Team"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div>
            <Label htmlFor="color">Team Color</Label>
            <Input id="color" type="color" {...register("color")} />
          </div>
          <div>
            <Label>Team Members</Label>
            <div className="border border-border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
              {players?.map((player) => (
                <div key={player.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`player-${player.id}`}
                    checked={memberIds?.includes(player.id)}
                    onCheckedChange={() => toggleMember(player.id)}
                  />
                  <label
                    htmlFor={`player-${player.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {player.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
