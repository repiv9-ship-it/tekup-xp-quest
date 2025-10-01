import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const AdminEvents = () => {
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("events")
      .insert({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        location: formData.get("location") as string,
        start_time: formData.get("start_time") as string,
        end_time: formData.get("end_time") as string,
        capacity: parseInt(formData.get("capacity") as string) || null,
        image_url: formData.get("image_url") as string || null,
        created_by: user?.id,
      });

    if (error) {
      toast.error("Failed to create event");
    } else {
      toast.success("Event created successfully!");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Event Management</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="event-title">Title</Label>
                  <Input id="event-title" name="title" required />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea id="event-description" name="description" required />
                </div>
                <div>
                  <Label htmlFor="event-location">Location</Label>
                  <Input id="event-location" name="location" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input id="start_time" name="start_time" type="datetime-local" required />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input id="end_time" name="end_time" type="datetime-local" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity (Optional)</Label>
                  <Input id="capacity" name="capacity" type="number" />
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL (Optional)</Label>
                  <Input id="image_url" name="image_url" type="url" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Create and manage club events. Events will appear on the Events page for all members.
        </p>
      </CardContent>
    </Card>
  );
};
