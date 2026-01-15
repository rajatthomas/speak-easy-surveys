-- Add rating and feedback columns to sessions table
ALTER TABLE public.sessions ADD COLUMN rating integer;
ALTER TABLE public.sessions ADD COLUMN feedback text[];