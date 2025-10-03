import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, CheckSquare, Calendar, Bell, MessageSquare } from "lucide-react";
import { AdminTasks } from "@/components/admin/AdminTasks";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { AdminMembers } from "@/components/admin/AdminMembers";
import { AdminAnnouncements } from "@/components/admin/AdminAnnouncements";
import { AdminLiveChat } from "@/components/admin/AdminLiveChat";

const Admin = () => {
  const navigate = useNavigate();
  const [isOfficer, setIsOfficer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOfficerStatus();
  }, []);

  const checkOfficerStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile?.role === "officer") {
        setIsOfficer(true);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isOfficer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-gradient-primary p-6 rounded-b-3xl shadow-glow">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="livechat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Bell className="h-4 w-4" />
              Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <AdminTasks />
          </TabsContent>

          <TabsContent value="events">
            <AdminEvents />
          </TabsContent>

          <TabsContent value="members">
            <AdminMembers />
          </TabsContent>

          <TabsContent value="livechat">
            <AdminLiveChat />
          </TabsContent>

          <TabsContent value="announcements">
            <AdminAnnouncements />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
