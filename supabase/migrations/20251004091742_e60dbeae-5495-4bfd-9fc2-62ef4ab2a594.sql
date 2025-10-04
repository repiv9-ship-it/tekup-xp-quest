-- Create chat tickets table
CREATE TYPE public.ticket_status AS ENUM ('pending', 'active', 'closed');

CREATE TABLE public.chat_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status ticket_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.chat_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own tickets"
  ON public.chat_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON public.chat_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Officers can view all tickets"
  ON public.chat_tickets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  ));

CREATE POLICY "Officers can update tickets"
  ON public.chat_tickets
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  ));

-- Add ticket_id to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN ticket_id UUID REFERENCES public.chat_tickets(id) ON DELETE CASCADE;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_tickets;