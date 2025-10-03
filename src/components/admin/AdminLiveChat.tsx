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

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const AdminLiveChat = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
    
    const channel = supabase
      .channel('admin-chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadConversations();
          if (selectedUserId) {
            loadMessages(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUserId]);

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

  const loadConversations = async () => {
    // Get all messages
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    // Get unique users (members only)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role");

    const memberProfiles = profiles?.filter(p => p.role === "member") || [];
    
    // Group messages by user
    const convMap = new Map<string, Conversation>();
    
    memberProfiles.forEach(profile => {
      const userMessages = messagesData?.filter(m => m.sender_id === profile.id) || [];
      const lastMsg = userMessages[0];
      
      if (lastMsg) {
        convMap.set(profile.id, {
          userId: profile.id,
          userName: profile.full_name,
          lastMessage: lastMsg.content,
          lastMessageTime: lastMsg.created_at,
          unreadCount: userMessages.filter(m => !m.is_read).length
        });
      }
    });

    setConversations(Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    ));
  };

  const loadMessages = async (userId: string) => {
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${userId},sender_id.eq.${currentUser?.id}`)
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
      .eq("sender_id", userId)
      .eq("is_read", false);
  };

  const handleSelectConversation = (userId: string) => {
    setSelectedUserId(userId);
    loadMessages(userId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedUserId) return;

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        content: newMessage.trim(),
        sender_id: currentUser.id
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
      {/* Conversations List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Chat Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className={`w-full p-4 border-b hover:bg-accent/50 transition-colors text-left ${
                    selectedUserId === conv.userId ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-secondary">
                          {conv.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                      </span>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedUserId ? (
          <>
            <CardHeader>
              <CardTitle>
                {conversations.find(c => c.userId === selectedUserId)?.userName || "Chat"}
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
