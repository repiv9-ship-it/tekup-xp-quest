import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  chapter_id: string | null;
  chapter?: {
    name: string;
    color: string;
  };
}

interface Chapter {
  id: string;
  name: string;
  color: string;
}

export const AdminSchedules = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    chapter_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSchedules();
    loadChapters();
  }, []);

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select(`
        *,
        chapter:chapter_id (
          name,
          color
        )
      `)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setSchedules(data as any);
    }
  };

  const loadChapters = async () => {
    const { data } = await supabase.from("chapters").select("*");
    if (data) setChapters(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submitData = {
      ...formData,
      chapter_id: formData.chapter_id || null,
      created_by: user.id,
    };

    const { error } = await supabase.from("schedules").insert(submitData);

    if (error) {
      toast({ title: "Error creating schedule", variant: "destructive" });
    } else {
      toast({ title: "Schedule created successfully" });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        chapter_id: "",
      });
      loadSchedules();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Schedule Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="chapter">Chapter (Optional)</Label>
                <Select
                  value={formData.chapter_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, chapter_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All chapters</SelectItem>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: chapter.color }}
                          />
                          {chapter.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create Schedule
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {schedule.chapter && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: schedule.chapter.color }}
                    />
                  )}
                  {schedule.title}
                </CardTitle>
                {schedule.chapter && (
                  <span className="text-sm text-muted-foreground">
                    {schedule.chapter.name}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {schedule.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {schedule.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(schedule.start_time), "MMM dd, yyyy")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(schedule.start_time), "HH:mm")} -{" "}
                  {format(new Date(schedule.end_time), "HH:mm")}
                </div>
                {schedule.location && <span>📍 {schedule.location}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
