-- Add booked_amount column to events table
ALTER TABLE public.events
ADD COLUMN booked_amount DECIMAL(10, 2) DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_booked_amount ON public.events(booked_amount);
