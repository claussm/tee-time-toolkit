import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TeamsTableProps {
  teams: any[];
  isLoading: boolean;
  onEdit: (team: any) => void;
  onDeactivate: (teamId: string) => void;
}

export function TeamsTable({ teams, isLoading, onEdit, onDeactivate }: TeamsTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading teams...</div>;
  }

  if (!teams || teams.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No teams found</div>;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: team.color || "#3B82F6" }}
                  />
                  <span className="font-medium">{team.name}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-md truncate">{team.description || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {team.player_team_members?.length || 0} members
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={team.is_active ? "default" : "secondary"}>
                  {team.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(team)}>
                  Edit
                </Button>
                {team.is_active && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeactivate(team.id)}
                  >
                    Deactivate
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
