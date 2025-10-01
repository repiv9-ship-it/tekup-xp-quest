import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  image_url: string;
}

interface RSVP {
  event_id: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadEvents();
    loadUserRSVPs();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .order("start_time", { ascending: true });
    
    if (data) {
      setEvents(data);
      loadRSVPCounts(data);
    }
  };

  const loadRSVPCounts = async (events: Event[]) => {
    const counts: Record<string, number> = {};
    
    for (const event of events) {
      const { count } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      
      counts[event.id] = count || 0;
    }
    
    setRsvpCounts(counts);
  };

  const loadUserRSVPs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("rsvps")
        .select("event_id")
        .eq("user_id", user.id);
      
      if (data) setRsvps(data);
    }
  };

  const hasRSVPed = (eventId: string) => {
    return rsvps.some(r => r.event_id === eventId);
  };

  const handleRSVP = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    if (hasRSVPed(eventId)) {
      // Cancel RSVP
      const { error } = await supabase
        .from("rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to cancel RSVP");
      } else {
        toast.success("RSVP cancelled");
        loadUserRSVPs();
        loadEvents();
      }
    } else {
      // Create RSVP
      const { error } = await supabase
        .from("rsvps")
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: "going"
        });

      if (error) {
        toast.error("Failed to RSVP");
      } else {
        toast.success("RSVP confirmed! See you there!");
        loadUserRSVPs();
        loadEvents();
      }
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-gradient-secondary p-6 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Events</h1>
          </div>
          <p className="text-muted-foreground">Join upcoming events and connect with members</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No upcoming events. Check back later!
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="shadow-card hover:shadow-glow transition-shadow overflow-hidden">
              {event.image_url && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{event.title}</span>
                  {hasRSVPed(event.id) && (
                    <Badge className="bg-success ml-2">Going</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{event.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {rsvpCounts[event.id] || 0} attending
                      {event.capacity && ` / ${event.capacity} spots`}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  variant={hasRSVPed(event.id) ? "outline" : "default"}
                  onClick={() => handleRSVP(event.id)}
                >
                  {hasRSVPed(event.id) ? "Cancel RSVP" : "RSVP"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Events;
