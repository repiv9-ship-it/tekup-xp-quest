import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Flame, Trophy } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  xp: number;
  level: number;
  streak: number;
  full_name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_pinned: boolean;
  created_at: string;
}

const Home = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (announcementsData) setAnnouncements(announcementsData);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-hero p-6 rounded-b-3xl shadow-glow">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Member"}!
          </h1>
          <p className="text-muted-foreground">Ready to level up today?</p>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{profile?.xp || 0}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur border-secondary/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-secondary" />
                <div className="text-2xl font-bold">Lvl {profile?.level || 1}</div>
                <div className="text-xs text-muted-foreground">Level</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur border-warning/20">
              <CardContent className="p-4 text-center">
                <Flame className="h-6 w-6 mx-auto mb-2 text-warning" />
                <div className="text-2xl font-bold">{profile?.streak || 0}</div>
                <div className="text-xs text-muted-foreground">Streak</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Announcements</h2>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No announcements yet. Check back later!
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="shadow-card hover:shadow-glow transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  {announcement.is_pinned && (
                    <Badge variant="secondary" className="ml-2">Pinned</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{announcement.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
