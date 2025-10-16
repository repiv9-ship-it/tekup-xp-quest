-- Create chapters table (roles/sections)
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Chapters are viewable by everyone
CREATE POLICY "Chapters are viewable by authenticated users"
ON public.chapters
FOR SELECT
TO authenticated
USING (true);

-- Officers can manage chapters
CREATE POLICY "Officers can manage chapters"
ON public.chapters
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  )
);

-- Create chapter_members junction table
CREATE TABLE IF NOT EXISTS public.chapter_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, user_id)
);

-- Enable RLS on chapter_members
ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

-- Users can view their own chapter memberships
CREATE POLICY "Users can view chapter memberships"
ON public.chapter_members
FOR SELECT
TO authenticated
USING (true);

-- Officers can manage chapter memberships
CREATE POLICY "Officers can manage chapter memberships"
ON public.chapter_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  )
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Users can view schedules for their chapters
CREATE POLICY "Users can view schedules for their chapters"
ON public.schedules
FOR SELECT
TO authenticated
USING (
  chapter_id IS NULL OR
  EXISTS (
    SELECT 1 FROM chapter_members
    WHERE chapter_members.chapter_id = schedules.chapter_id
    AND chapter_members.user_id = auth.uid()
  )
);

-- Officers can manage schedules
CREATE POLICY "Officers can manage schedules"
ON public.schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  )
);

-- Create internal messages table
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on internal_messages
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their received messages
CREATE POLICY "Users can view their received messages"
ON public.internal_messages
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- Officers can send messages
CREATE POLICY "Officers can send messages"
ON public.internal_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'officer'
  )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages"
ON public.internal_messages
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid());

-- Add chapter_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Add chapter_id to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Add chapter_id to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Update RLS policies for tasks to be chapter-specific
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.tasks;
CREATE POLICY "Tasks are viewable by authenticated users"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    chapter_id IS NULL OR
    EXISTS (
      SELECT 1 FROM chapter_members
      WHERE chapter_members.chapter_id = tasks.chapter_id
      AND chapter_members.user_id = auth.uid()
    )
  )
);

-- Update RLS policies for events to be chapter-specific
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by authenticated users"
ON public.events
FOR SELECT
TO authenticated
USING (
  chapter_id IS NULL OR
  EXISTS (
    SELECT 1 FROM chapter_members
    WHERE chapter_members.chapter_id = events.chapter_id
    AND chapter_members.user_id = auth.uid()
  )
);

-- Update RLS policies for announcements to be chapter-specific
DROP POLICY IF EXISTS "Announcements are viewable by authenticated users" ON public.announcements;
CREATE POLICY "Announcements are viewable by authenticated users"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    chapter_id IS NULL OR
    EXISTS (
      SELECT 1 FROM chapter_members
      WHERE chapter_members.chapter_id = announcements.chapter_id
      AND chapter_members.user_id = auth.uid()
    )
  )
);

-- Add last_login_date to profiles for streak calculation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- Add trigger for updated_at on chapters
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add trigger for updated_at on schedules
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for internal_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;