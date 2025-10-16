import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  name: string;
  color: string;
  description: string | null;
  member_count?: number;
}

export const AdminChapters = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    description: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from("chapters")
      .select(`
        *,
        chapter_members(count)
      `);

    if (!error && data) {
      const chaptersWithCount = data.map((chapter: any) => ({
        ...chapter,
        member_count: chapter.chapter_members[0]?.count || 0,
      }));
      setChapters(chaptersWithCount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingChapter) {
      const { error } = await supabase
        .from("chapters")
        .update(formData)
        .eq("id", editingChapter.id);

      if (error) {
        toast({ title: "Error updating chapter", variant: "destructive" });
      } else {
        toast({ title: "Chapter updated successfully" });
      }
    } else {
      const { error } = await supabase.from("chapters").insert(formData);

      if (error) {
        toast({ title: "Error creating chapter", variant: "destructive" });
      } else {
        toast({ title: "Chapter created successfully" });
      }
    }

    setIsDialogOpen(false);
    setEditingChapter(null);
    setFormData({ name: "", color: "#3B82F6", description: "" });
    loadChapters();
  };

  const openEditDialog = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      name: chapter.name,
      color: chapter.color,
      description: chapter.description || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingChapter(null);
    setFormData({ name: "", color: "#3B82F6", description: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Chapters Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChapter ? "Edit Chapter" : "Create New Chapter"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Chapter Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
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
              <Button type="submit" className="w-full">
                {editingChapter ? "Update Chapter" : "Create Chapter"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: chapter.color }}
                  />
                  {chapter.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(chapter)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chapter.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {chapter.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {chapter.member_count} members
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
