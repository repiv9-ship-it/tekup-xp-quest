import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Flame, Trophy, Calendar, Clock, MapPin } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { formatDistanceToNow, format } from "date-fns";

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

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  chapter?: {
    name: string;
    color: string;
  };
}

const Home = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    updateStreak();
    loadData();
  }, []);

  const updateStreak = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_login_date, streak")
      .eq("id", user.id)
      .single();

    if (profile) {
      const lastLogin = profile.last_login_date;
      let newStreak = profile.streak || 0;

      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      if (lastLogin !== today) {
        await supabase
          .from("profiles")
          .update({ last_login_date: today, streak: newStreak })
          .eq("id", user.id);
      }
    }
  };

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp, level, streak, full_name")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load user's chapter schedules
      const { data: scheduleData } = await supabase
        .from("schedules")
        .select(`
          *,
          chapter:chapter_id (
            name,
            color
          )
        `)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (scheduleData) {
        setSchedules(scheduleData as any);
      }

      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (announcementsData) {
        setAnnouncements(announcementsData);
      }
    }
  };

  const getStreakBonus = (streak: number) => {
    if (streak >= 30) return "3x XP";
    if (streak >= 14) return "2x XP";
    if (streak >= 7) return "1.5x XP";
    return "1x XP";
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
                <Badge variant="secondary" className="mt-1 text-xs">
                  {getStreakBonus(profile?.streak || 0)}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Schedules */}
        {schedules.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Upcoming Schedule</h2>
            </div>
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className="shadow-card hover:shadow-glow transition-shadow"
                >
                  <CardContent className="p-4">
                    <div
                      className="border-l-4 pl-4"
                      style={{ borderLeftColor: schedule.chapter?.color || "#3B82F6" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{schedule.title}</h3>
                        {schedule.chapter && (
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: schedule.chapter.color + "20",
                              color: schedule.chapter.color,
                            }}
                          >
                            {schedule.chapter.name}
                          </Badge>
                        )}
                      </div>
                      {schedule.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {schedule.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(schedule.start_time), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(schedule.start_time), "HH:mm")} -{" "}
                          {format(new Date(schedule.end_time), "HH:mm")}
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {schedule.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Announcements */}
        <div>
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
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
