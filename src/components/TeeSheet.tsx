import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, useDraggable } from "@dnd-kit/core";
import { TeeSheetGroup } from "./TeeSheetGroup";
import { toast } from "sonner";

interface TeeSheetProps {
  eventId: string;
  groups: any[];
  isLocked: boolean;
  slotsPerGroup: number;
}

export const TeeSheet = ({ eventId, groups, isLocked, slotsPerGroup }: TeeSheetProps) => {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  const { data: unassignedPlayers } = useQuery({
    queryKey: ["unassigned_players", eventId],
    queryFn: async () => {
      const { data: playingPlayers, error } = await supabase
        .from("event_players")
        .select("*, players(*)")
        .eq("event_id", eventId)
        .eq("status", "playing");

      if (error) throw error;

      const assignedIds = new Set();
      groups.forEach((group) => {
        group.group_assignments?.forEach((assignment: any) => {
          assignedIds.add(assignment.player_id);
        });
      });

      return playingPlayers.filter((ep) => !assignedIds.has(ep.player_id));
    },
  });

  const movePlayerMutation = useMutation({
    mutationFn: async ({
      playerId,
      targetGroupId,
      targetPosition,
    }: {
      playerId: string;
      targetGroupId: string;
      targetPosition: number;
    }) => {
      // Remove from current group if assigned
      await supabase.from("group_assignments").delete().eq("player_id", playerId);

      // Add to new group
      const { error } = await supabase.from("group_assignments").insert({
        group_id: targetGroupId,
        player_id: playerId,
        position: targetPosition,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", eventId] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_players", eventId] });
    },
    onError: () => {
      toast.error("Failed to move player");
    },
  });

  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("group_assignments")
        .delete()
        .eq("player_id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", eventId] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_players", eventId] });
      toast.success("Player removed from group");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || isLocked) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Parse IDs
    const [, targetGroupId, positionStr] = overId.split("-");
    const targetPosition = parseInt(positionStr);

    movePlayerMutation.mutate({
      playerId: activeId,
      targetGroupId,
      targetPosition,
    });
  };

  return (
    <div className="space-y-6">
      {!isLocked && unassignedPlayers && unassignedPlayers.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-accent/20 print:hidden">
          <h3 className="font-semibold mb-3 text-foreground">Unassigned Players</h3>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((ep) => (
              <UnassignedPlayer 
                key={ep.player_id} 
                playerId={ep.player_id}
                playerName={ep.players.name}
              />
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <TeeSheetGroup
              key={group.id}
              group={group}
              isLocked={isLocked}
              slotsPerGroup={slotsPerGroup}
              onRemovePlayer={removePlayerMutation.mutate}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

interface UnassignedPlayerProps {
  playerId: string;
  playerName: string;
}

const UnassignedPlayer = ({ playerId, playerName }: UnassignedPlayerProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: playerId,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "move",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-1 bg-card border border-border rounded text-sm text-foreground hover:border-primary transition-colors"
      {...attributes}
      {...listeners}
    >
      {playerName}
    </div>
  );
};