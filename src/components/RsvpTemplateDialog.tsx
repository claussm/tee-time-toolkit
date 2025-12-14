import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  subject: z.string().trim().max(200, "Subject must be less than 200 characters").optional().or(z.literal("")),
  body: z.string().trim().min(1, "Message body is required").max(2000, "Message must be less than 2000 characters"),
  channel: z.enum(["email", "sms", "both"]),
  is_default: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface RsvpTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Tables<"rsvp_templates"> | null;
}

const TEMPLATE_VARIABLES = [
  { variable: "{{player_name}}", description: "Player's name" },
  { variable: "{{event_date}}", description: "Event date" },
  { variable: "{{course_name}}", description: "Course name" },
  { variable: "{{first_tee_time}}", description: "First tee time" },
  { variable: "{{holes}}", description: "Number of holes (9 or 18)" },
  { variable: "{{rsvp_link}}", description: "RSVP response link" },
];

export const RsvpTemplateDialog = ({ open, onOpenChange, template }: RsvpTemplateDialogProps) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      channel: "email",
      is_default: false,
    },
  });

  const channel = watch("channel");

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          name: template.name || "",
          subject: template.subject || "",
          body: template.body || "",
          channel: template.channel as "email" | "sms" | "both",
          is_default: template.is_default ?? false,
        });
      } else {
        reset({
          name: "",
          subject: "",
          body: "",
          channel: "email",
          is_default: false,
        });
      }
    }
  }, [open, template, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const templateData = {
        name: data.name,
        subject: data.channel === "sms" ? null : (data.subject || null),
        body: data.body,
        channel: data.channel,
        is_default: data.is_default,
      };

      if (template) {
        const { error } = await supabase
          .from("rsvp_templates")
          .update(templateData)
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rsvp_templates").insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsvp_templates"] });
      toast.success(template ? "Template updated" : "Template created");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    saveMutation.mutate(data);
  };

  const insertVariable = (variable: string) => {
    const currentBody = watch("body");
    setValue("body", currentBody + variable);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template ? "Update your RSVP message template." : "Create a new RSVP message template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input id="name" placeholder="e.g., Weekly Invitation" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="channel">Channel *</Label>
              <Select
                value={channel}
                onValueChange={(value: "email" | "sms" | "both") => setValue("channel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {channel !== "sms" && (
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Golf Event RSVP - {{event_date}}"
                {...register("subject")}
              />
              {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="body">Message Body *</Label>
            <Textarea
              id="body"
              rows={channel === "sms" ? 4 : 8}
              placeholder={channel === "sms"
                ? "Hi {{player_name}}! Golf on {{event_date}} at {{course_name}}. Reply YES or NO."
                : "Hi {{player_name}},\n\nYou're invited to golf on {{event_date}} at {{course_name}}.\n\nPlease RSVP: {{rsvp_link}}"
              }
              {...register("body")}
            />
            {errors.body && <p className="text-sm text-destructive mt-1">{errors.body.message}</p>}
            {channel === "sms" && (
              <p className="text-xs text-muted-foreground mt-1">
                SMS messages should be under 160 characters for best delivery.
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <Label className="text-sm font-medium mb-2 block">Available Variables</Label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <Button
                  key={v.variable}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(v.variable)}
                  title={v.description}
                >
                  {v.variable}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="is_default"
                checked={watch("is_default")}
                onCheckedChange={(checked) => setValue("is_default", checked)}
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Set as default for {channel === "both" ? "this channel" : channel}
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {template ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
