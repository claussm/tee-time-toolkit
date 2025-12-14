import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Mail, MessageSquare, Star } from "lucide-react";
import { RsvpTemplateDialog } from "@/components/RsvpTemplateDialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Tables } from "@/integrations/supabase/types";

const RsvpTemplates = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Tables<"rsvp_templates"> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Tables<"rsvp_templates"> | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rsvp_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsvp_templates"] });
      toast.success("Template deleted");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const handleEdit = (template: Tables<"rsvp_templates">) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (template: Tables<"rsvp_templates">) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "both":
        return (
          <div className="flex gap-1">
            <Mail className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "email":
        return "Email";
      case "sms":
        return "SMS";
      case "both":
        return "Email & SMS";
      default:
        return channel;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="RSVP Templates"
        subtitle="Manage your RSVP message templates"
        action={
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first RSVP message template to get started.
            </p>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="max-w-xs">Preview</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(template.channel)}
                        <span>{getChannelLabel(template.channel)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.subject || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {template.body}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Template Variables</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Use these variables in your templates. They will be replaced with actual values when sending:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><code className="bg-muted px-1 rounded">{"{{player_name}}"}</code> - Player's name</div>
            <div><code className="bg-muted px-1 rounded">{"{{event_date}}"}</code> - Event date</div>
            <div><code className="bg-muted px-1 rounded">{"{{course_name}}"}</code> - Course name</div>
            <div><code className="bg-muted px-1 rounded">{"{{first_tee_time}}"}</code> - First tee time</div>
            <div><code className="bg-muted px-1 rounded">{"{{holes}}"}</code> - Number of holes</div>
            <div><code className="bg-muted px-1 rounded">{"{{rsvp_link}}"}</code> - RSVP response link</div>
          </div>
        </div>
      </main>

      <RsvpTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RsvpTemplates;
