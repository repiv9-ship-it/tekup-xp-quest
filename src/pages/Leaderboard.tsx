import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Medal, Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  xp: number;
  level: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, xp, level")
      .order("xp", { ascending: false })
      .limit(100);
    
    if (data) setLeaderboard(data);
  };

  const getRankIcon = (index: number) => {
    switch(index) {
      case 0: return <Crown className="h-6 w-6 text-warning" />;
      case 1: return <Medal className="h-6 w-6 text-muted-foreground" />;
      case 2: return <Medal className="h-6 w-6 text-orange-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-gradient-hero p-6 rounded-b-3xl shadow-glow">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Trophy className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground ml-16">Top members by XP</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-3">
        {leaderboard.map((entry, index) => (
          <Card 
            key={entry.id}
            className={`shadow-card hover:shadow-glow transition-shadow ${
              entry.id === currentUserId ? "border-primary border-2" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/20 font-bold">
                  {getRankIcon(index) || `#${index + 1}`}
                </div>
                
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {entry.full_name}
                    {entry.id === currentUserId && (
                      <span className="text-xs text-primary">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Level {entry.level}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <TrendingUp className="h-4 w-4" />
                    {entry.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {leaderboard.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No members found. Be the first to earn XP!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
