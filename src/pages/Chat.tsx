import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string;
    role: string;
  };
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOfficer, setIsOfficer] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserAndMessages();
    
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          if (ticketId) loadMessages(ticketId);
        }
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel('chat-tickets')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_tickets'
        },
        (payload) => {
          if (payload.new.id === ticketId) {
            setTicketStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadUserAndMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setCurrentUser(profile);
      setIsOfficer(profile?.role === "officer");
      
      // Check for most recent ticket
      const { data: existingTickets } = await supabase
        .from("chat_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const existingTicket = existingTickets?.[0];

      if (existingTicket && existingTicket.status !== 'closed') {
        setTicketId(existingTicket.id);
        setTicketStatus(existingTicket.status);
        await loadMessages(existingTicket.id);
      } else if (existingTicket?.status === 'closed') {
        // Show closed ticket but don't auto-create new one
        setTicketId(existingTicket.id);
        setTicketStatus(existingTicket.status);
        await loadMessages(existingTicket.id);
      } else {
        // Create new ticket only if no ticket exists
        const { data: newTicket, error } = await supabase
          .from("chat_tickets")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!error && newTicket) {
          setTicketId(newTicket.id);
          setTicketStatus(newTicket.status);
        }
      }
    }
  };

  const loadMessages = async (ticket_id: string) => {
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    // Get unique sender IDs
    const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
    
    // Fetch profiles for all senders
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", senderIds);

    // Map profiles to messages
    const messagesWithSenders = messagesData?.map(msg => ({
      ...msg,
      sender: profiles?.find(p => p.id === msg.sender_id)
    })) || [];

    setMessages(messagesWithSenders as Message[]);
  };

  const handleCreateNewTicket = async () => {
    if (!currentUser) return;

    const { data: newTicket, error } = await supabase
      .from("chat_tickets")
      .insert({ user_id: currentUser.id })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
      return;
    }

    setTicketId(newTicket.id);
    setTicketStatus(newTicket.status);
    setMessages([]);
    toast({
      title: "Success",
      description: "New support ticket created"
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !ticketId) return;

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        content: newMessage.trim(),
        sender_id: currentUser.id,
        ticket_id: ticketId
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-primary p-6 rounded-b-3xl shadow-glow">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="text-foreground hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isOfficer ? "Member Support Chat" : "Chat with Staff"}
              </h1>
              <p className="text-foreground/80 mt-1">
                {isOfficer 
                  ? "View and respond to all member messages" 
                  : "Get help from our admin team"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Card className="h-[calc(100vh-280px)] flex flex-col">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {ticketStatus === 'pending' && (
            <div className="p-4 bg-muted/50 border-b">
              <p className="text-sm text-muted-foreground text-center">
                Your support ticket is pending. An admin will respond soon.
              </p>
            </div>
          )}
          {ticketStatus === 'closed' && (
            <div className="p-4 bg-muted/50 border-b flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground text-center">
                This ticket has been closed.
              </p>
              <Button onClick={handleCreateNewTicket} size="sm">
                Start New Ticket
              </Button>
            </div>
          )}
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 pb-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUser?.id;
                  const senderName = message.sender?.full_name || "Unknown";
                  const senderRole = message.sender?.role || "member";
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={senderRole === "officer" ? "bg-primary" : "bg-secondary"}>
                          {senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} flex-1 max-w-[80%]`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {senderName}
                          </span>
                          {senderRole === "officer" && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Staff
                            </span>
                          )}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={ticketStatus === 'closed'}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newMessage.trim() || ticketStatus === 'closed'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
