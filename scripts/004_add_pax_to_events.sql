-- Add pax (number of guests) column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pax INTEGER DEFAULT 0;
