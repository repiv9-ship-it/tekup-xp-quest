import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { CheckSquare, Zap, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  difficulty: string;
  xp_reward: number;
  due_date: string;
  requires_proof: boolean;
}

interface Submission {
  task_id: string;
  status: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
    loadSubmissions();
  }, []);

  const loadTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    if (data) setTasks(data);
  };

  const loadSubmissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("task_submissions")
        .select("task_id, status")
        .eq("user_id", user.id);
      
      if (data) setSubmissions(data);
    }
  };

  const getTaskStatus = (taskId: string) => {
    const submission = submissions.find(s => s.task_id === taskId);
    return submission?.status || "not_started";
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("task_submissions")
        .insert({
          task_id: selectedTask.id,
          user_id: user.id,
          notes: submissionNotes,
          status: "pending"
        });

      if (error) {
        toast.error("Failed to submit task");
      } else {
        toast.success("Task submitted! Awaiting approval.");
        loadSubmissions();
        setSubmissionNotes("");
        setSelectedTask(null);
      }
    }
    setLoading(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case "easy": return "bg-success/20 text-success";
      case "medium": return "bg-warning/20 text-warning";
      case "hard": return "bg-destructive/20 text-destructive";
      default: return "bg-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "approved": return <Badge className="bg-success">Completed</Badge>;
      case "pending": return <Badge className="bg-warning">Pending</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-gradient-primary p-6 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Tasks</h1>
          </div>
          <p className="text-muted-foreground">Complete tasks to earn XP and level up!</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No tasks available. Check back later!
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const status = getTaskStatus(task.id);
            return (
              <Card key={task.id} className="shadow-card hover:shadow-glow transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {task.title}
                        <Badge className={getDifficultyColor(task.difficulty)} variant="outline">
                          {task.difficulty}
                        </Badge>
                      </CardTitle>
                    </div>
                    {getStatusBadge(status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{task.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{task.xp_reward} XP</span>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Due {format(new Date(task.due_date), "MMM d")}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      {task.task_type}
                    </Badge>
                  </div>

                  {status === "not_started" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-gradient-primary"
                          onClick={() => setSelectedTask(task)}
                        >
                          Submit Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Task</DialogTitle>
                          <DialogDescription>
                            Submit your work for review. An officer will approve it shortly.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Add notes about your submission..."
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                          />
                          <Button 
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={loading}
                          >
                            {loading ? "Submitting..." : "Submit"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Tasks;
