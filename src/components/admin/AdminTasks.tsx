import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";

interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  notes: string;
  status: string;
  submitted_at: string;
  profiles: {
    full_name: string;
  };
  tasks: {
    title: string;
    xp_reward: number;
  };
}

export const AdminTasks = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from("task_submissions")
      .select(`
        *,
        profiles!task_submissions_user_id_fkey(full_name),
        tasks!task_submissions_task_id_fkey(title, xp_reward)
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });
    
    if (data) setSubmissions(data as any);
  };

  const handleApprove = async (submissionId: string, xpReward: number, userId: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Update submission status
    const { error: updateError } = await supabase
      .from("task_submissions")
      .update({
        status: "approved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateError) {
      toast.error("Failed to approve submission");
      setLoading(false);
      return;
    }

    // Award XP to user
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, level")
      .eq("id", userId)
      .single();

    if (profile) {
      const newXP = profile.xp + xpReward;
      const newLevel = Math.floor(newXP / 100) + 1;

      await supabase
        .from("profiles")
        .update({ xp: newXP, level: newLevel })
        .eq("id", userId);
    }

    toast.success("Task approved! XP awarded.");
    loadSubmissions();
    setLoading(false);
  };

  const handleReject = async (submissionId: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("task_submissions")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      toast.error("Failed to reject submission");
    } else {
      toast.success("Task rejected");
      loadSubmissions();
    }
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("tasks")
      .insert([{
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        task_type: formData.get("task_type") as any,
        difficulty: formData.get("difficulty") as any,
        xp_reward: parseInt(formData.get("xp_reward") as string),
        due_date: formData.get("due_date") as string || null,
        created_by: user?.id,
      }]);

    if (error) {
      toast.error("Failed to create task");
    } else {
      toast.success("Task created successfully!");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Submissions</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="task_type">Type</Label>
                      <Select name="task_type" defaultValue="one-off" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="one-off">One-off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select name="difficulty" defaultValue="medium" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="xp_reward">XP Reward</Label>
                    <Input id="xp_reward" name="xp_reward" type="number" defaultValue={10} required />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date (Optional)</Label>
                    <Input id="due_date" name="due_date" type="datetime-local" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating..." : "Create Task"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending submissions
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{submission.tasks.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          by {submission.profiles.full_name}
                        </p>
                      </div>
                      <Badge>{submission.tasks.xp_reward} XP</Badge>
                    </div>
                    {submission.notes && (
                      <p className="text-sm mb-4">{submission.notes}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-2 bg-success"
                        onClick={() => handleApprove(submission.id, submission.tasks.xp_reward, submission.user_id)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => handleReject(submission.id)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
