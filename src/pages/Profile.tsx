import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { User, Zap, TrendingUp, Trophy, Crown, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  email: string;
  student_id: string;
  year: number;
  major: string;
  bio: string;
  xp: number;
  level: number;
  streak: number;
  role: string;
}

interface UserBadge {
  badges: {
    name: string;
    description: string;
  };
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    loadProfile();
    loadBadges();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) setProfile(data);
    }
  };

  const loadBadges = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("user_badges")
        .select("badges(name, description)")
        .eq("user_id", user.id);
      
      if (data) setBadges(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const calculateXPForNextLevel = (level: number) => {
    return level * 100;
  };

  const getXPProgress = () => {
    if (!profile) return 0;
    const xpForNextLevel = calculateXPForNextLevel(profile.level);
    const previousLevelXP = (profile.level - 1) * 100;
    const currentLevelProgress = profile.xp - previousLevelXP;
    const levelRange = xpForNextLevel - previousLevelXP;
    return (currentLevelProgress / levelRange) * 100;
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-gradient-hero p-6 rounded-b-3xl shadow-glow">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Profile</h1>
            </div>
            {profile.role === "officer" && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-2"
              >
                <Crown className="h-4 w-4" />
                Admin
              </Button>
            )}
          </div>

          {/* Profile Card */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
                  <User className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.role === "officer" && (
                  <Badge className="mt-2 bg-gradient-primary">Officer</Badge>
                )}
              </div>

              {/* Level Progress */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Level {profile.level}
                  </span>
                  <span className="text-muted-foreground">
                    {profile.xp} / {calculateXPForNextLevel(profile.level)} XP
                  </span>
                </div>
                <Progress value={getXPProgress()} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{profile.xp}</div>
                  <div className="text-xs text-muted-foreground">Total XP</div>
                </div>
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-warning" />
                  <div className="text-2xl font-bold">{profile.streak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Additional Info */}
              {(profile.student_id || profile.major || profile.year) && (
                <div className="space-y-2 text-sm">
                  {profile.student_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student ID:</span>
                      <span>{profile.student_id}</span>
                    </div>
                  )}
                  {profile.major && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Major:</span>
                      <span>{profile.major}</span>
                    </div>
                  )}
                  {profile.year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year:</span>
                      <span>{profile.year}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Badges Earned
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((userBadge, index) => (
                  <Card key={index} className="bg-card/50 backdrop-blur">
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="font-semibold text-sm">{userBadge.badges.name}</div>
                      <div className="text-xs text-muted-foreground">{userBadge.badges.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => navigate("/leaderboard")}
            >
              <Trophy className="h-4 w-4" />
              View Leaderboard
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
