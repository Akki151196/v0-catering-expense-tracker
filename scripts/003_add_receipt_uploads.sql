-- Add receipt_url and receipt_file_path columns if they don't exist
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_file_name TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP WITH TIME ZONE;
