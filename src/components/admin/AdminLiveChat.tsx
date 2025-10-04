import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
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

interface Ticket {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export const AdminLiveChat = () => {
  const { toast } = useToast();
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadTickets();
    
    const messagesChannel = supabase
      .channel('admin-chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadTickets();
          if (selectedTicket) {
            loadMessages(selectedTicket.id);
          }
        }
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel('admin-chat-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_tickets'
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [selectedTicket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const loadTickets = async () => {
    const { data: ticketsData, error } = await supabase
      .from("chat_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tickets:", error);
      return;
    }

    // Get profiles for ticket users
    const userIds = ticketsData?.map(t => t.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    // Get messages for each ticket
    const { data: allMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false });

    const ticketsWithDetails: Ticket[] = ticketsData?.map(ticket => {
      const profile = profiles?.find(p => p.id === ticket.user_id);
      const ticketMessages = allMessages?.filter(m => m.ticket_id === ticket.id) || [];
      const lastMsg = ticketMessages[0];
      
      return {
        ...ticket,
        userName: profile?.full_name || "Unknown",
        lastMessage: lastMsg?.content,
        lastMessageTime: lastMsg?.created_at,
        unreadCount: ticketMessages.filter(m => !m.is_read && m.sender_id !== currentUser?.id).length
      };
    }) || [];

    setPendingTickets(ticketsWithDetails.filter(t => t.status === 'pending'));
    setActiveTickets(ticketsWithDetails.filter(t => t.status === 'active'));
  };

  const loadMessages = async (ticketId: string) => {
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    // Get profiles for all senders
    const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
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

    // Mark messages as read
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("ticket_id", ticketId)
      .neq("sender_id", currentUser?.id)
      .eq("is_read", false);
  };

  const handleAcceptTicket = async (ticket: Ticket) => {
    const { error } = await supabase
      .from("chat_tickets")
      .update({ 
        status: 'active',
        accepted_by: currentUser?.id,
        accepted_at: new Date().toISOString()
      })
      .eq("id", ticket.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept ticket",
        variant: "destructive"
      });
      return;
    }

    setSelectedTicket(ticket);
    loadMessages(ticket.id);
    toast({
      title: "Success",
      description: "Ticket accepted"
    });
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from("chat_tickets")
      .update({ status: 'closed' })
      .eq("id", selectedTicket.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket closed"
    });
    setSelectedTicket(null);
    setMessages([]);
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedTicket) return;

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        content: newMessage.trim(),
        sender_id: currentUser.id,
        ticket_id: selectedTicket.id
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
      {/* Tickets List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {/* Pending Tickets */}
            {pendingTickets.length > 0 && (
              <div className="border-b">
                <div className="p-3 bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Pending ({pendingTickets.length})</p>
                </div>
                {pendingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="w-full p-4 border-b hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-secondary">
                            {ticket.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.userName}</p>
                          {ticket.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      {ticket.lastMessageTime && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(ticket.lastMessageTime), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleAcceptTicket(ticket)}
                      size="sm"
                      className="w-full"
                    >
                      Accept Ticket
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Active Tickets */}
            {activeTickets.length > 0 && (
              <div>
                <div className="p-3 bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Active ({activeTickets.length})</p>
                </div>
                {activeTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full p-4 border-b hover:bg-accent/50 transition-colors text-left ${
                      selectedTicket?.id === ticket.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-secondary">
                            {ticket.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.userName}</p>
                          {ticket.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {ticket.lastMessageTime && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(ticket.lastMessageTime), { addSuffix: true })}
                          </span>
                        )}
                        {ticket.unreadCount > 0 && (
                          <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                            {ticket.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pendingTickets.length === 0 && activeTickets.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                No tickets yet
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedTicket ? (
          <>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedTicket.userName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedTicket.status === 'active' ? 'default' : 'secondary'}>
                    {selectedTicket.status}
                  </Badge>
                  {selectedTicket.status === 'active' && (
                    <Button 
                      onClick={handleCloseTicket}
                      variant="destructive"
                      size="sm"
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
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
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </Card>
    </div>
  );
};
