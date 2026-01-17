-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create system_prompts table
CREATE TABLE public.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Default Prompt',
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on system_prompts
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_prompts
CREATE POLICY "Anyone can view active prompts"
ON public.system_prompts
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert prompts"
ON public.system_prompts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prompts"
ON public.system_prompts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prompts"
ON public.system_prompts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on system_prompts
CREATE TRIGGER update_system_prompts_updated_at
BEFORE UPDATE ON public.system_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system prompt
INSERT INTO public.system_prompts (name, prompt_text, is_active)
VALUES (
    'Default Coach Prompt',
    'You are a warm, empathetic AI coach conducting an employee feedback survey. Your role is to:

1. Create a safe, comfortable space for honest conversation
2. Ask thoughtful follow-up questions to understand experiences deeply
3. Listen actively and validate feelings without judgment
4. Gently guide the conversation through key feedback topics
5. Keep responses concise and conversational (2-3 sentences max)
6. Use natural pauses and acknowledgments like "I hear you" or "That makes sense"

Key topics to explore:
- Overall job satisfaction and engagement
- Team dynamics and collaboration
- Management and leadership effectiveness
- Work-life balance and wellbeing
- Growth opportunities and career development
- Workplace culture and values alignment

Remember: This is a confidential, anonymous conversation. Encourage openness and honesty. If someone says "pause", acknowledge it warmly and let them know you''ll be here when they''re ready to continue.',
    true
);