
-- Create link categories table for custom labels (anime, movie, cartoon, etc.)
CREATE TABLE public.link_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.link_categories ENABLE ROW LEVEL SECURITY;

-- Everyone authorized can view categories
CREATE POLICY "Authorized users can view categories"
  ON public.link_categories FOR SELECT
  USING (public.is_authorized(auth.uid()));

-- Owners and admins can manage categories
CREATE POLICY "Authorized users can manage categories"
  ON public.link_categories FOR ALL
  USING (public.is_authorized(auth.uid()));

-- Insert default categories
INSERT INTO public.link_categories (name, color) VALUES
  ('Anime', '#f43f5e'),
  ('Movie', '#8b5cf6'),
  ('Anime Movie', '#ec4899'),
  ('Cartoon', '#f59e0b'),
  ('Series', '#10b981'),
  ('Other', '#6b7280');

-- Create links table to track generated bot links
CREATE TABLE public.bot_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bot_link TEXT NOT NULL,
  category_id UUID REFERENCES public.link_categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  first_msg_id BIGINT,
  last_msg_id BIGINT,
  link_type TEXT NOT NULL DEFAULT 'single' CHECK (link_type IN ('single', 'batch', 'custom_batch')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  shared_with UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_links ENABLE ROW LEVEL SECURITY;

-- Authorized users (owners/admins) can view all links
CREATE POLICY "Authorized users can view all links"
  ON public.bot_links FOR SELECT
  USING (public.is_authorized(auth.uid()));

-- Regular users can view links shared with them
CREATE POLICY "Users can view shared links"
  ON public.bot_links FOR SELECT
  USING (auth.uid() = ANY(shared_with) AND is_active = true);

-- Authorized users can create links
CREATE POLICY "Authorized users can create links"
  ON public.bot_links FOR INSERT
  WITH CHECK (public.is_authorized(auth.uid()));

-- Authorized users can update links
CREATE POLICY "Authorized users can update links"
  ON public.bot_links FOR UPDATE
  USING (public.is_authorized(auth.uid()));

-- Owners can delete links
CREATE POLICY "Owners can delete links"
  ON public.bot_links FOR DELETE
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Admins can delete their own links
CREATE POLICY "Admins can delete own links"
  ON public.bot_links FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

-- Create activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  link_id UUID REFERENCES public.bot_links(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Authorized users can view activity
CREATE POLICY "Authorized users can view activity"
  ON public.activity_log FOR SELECT
  USING (public.is_authorized(auth.uid()));

-- Authorized users can create activity entries
CREATE POLICY "Authorized users can create activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_authorized(auth.uid()));

-- Trigger for updated_at on bot_links
CREATE TRIGGER update_bot_links_updated_at
  BEFORE UPDATE ON public.bot_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_bot_links_category ON public.bot_links(category_id);
CREATE INDEX idx_bot_links_created_by ON public.bot_links(created_by);
CREATE INDEX idx_bot_links_created_at ON public.bot_links(created_at DESC);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_bot_links_shared ON public.bot_links USING GIN(shared_with);
