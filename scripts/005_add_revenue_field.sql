-- Add revenue field to events table to calculate profit/loss
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10, 2) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_expenses_event_date ON public.expenses(event_id, expense_date);
