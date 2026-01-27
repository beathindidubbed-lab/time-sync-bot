-- Create function to auto-assign owner role based on email
CREATE OR REPLACE FUNCTION public.auto_assign_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email TEXT;
BEGIN
  -- Get owner email from bot_settings (we'll store it there)
  SELECT setting_value->>'email' INTO owner_email
  FROM public.bot_settings
  WHERE setting_key = 'owner_email';
  
  -- If this user's email matches, assign owner role
  IF NEW.email = owner_email THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (we need to use a different approach since we can't directly trigger on auth.users)
-- Instead, we'll modify handle_new_user to check for owner assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  
  -- Get owner email from bot_settings
  SELECT setting_value->>'email' INTO owner_email
  FROM public.bot_settings
  WHERE setting_key = 'owner_email';
  
  -- If this user's email matches owner email, assign owner role
  IF NEW.email = owner_email THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create bot_env_vars table for storing bot environment variables
CREATE TABLE IF NOT EXISTS public.bot_env_vars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_env_vars ENABLE ROW LEVEL SECURITY;

-- Only owners can manage env vars
CREATE POLICY "Owners can manage env vars"
  ON public.bot_env_vars
  FOR ALL
  USING (has_role(auth.uid(), 'owner'));

-- Authorized users can view non-secret env vars
CREATE POLICY "Authorized users can view env vars"
  ON public.bot_env_vars
  FOR SELECT
  USING (is_authorized(auth.uid()) AND NOT is_secret);

-- Trigger for updated_at
CREATE TRIGGER update_bot_env_vars_updated_at
  BEFORE UPDATE ON public.bot_env_vars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();