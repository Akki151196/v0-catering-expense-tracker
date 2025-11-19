/*
  # Initial Setup for Royal Catering Expense Management Portal
  
  1. New Tables
    - `profiles` - User profiles linked to auth.users
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `full_name` (text)
      - `role` (text, default 'staff')
      - `created_at` (timestamptz)
    
    - `events` - Catering events
      - `id` (uuid, primary key)
      - `created_by` (uuid, references auth.users)
      - `name` (text, not null)
      - `date` (date, not null)
      - `client_name` (text, not null)
      - `location` (text, not null)
      - `status` (text, default 'planned')
      - `pax` (integer, default 0) - number of guests
      - `revenue` (decimal, default 0)
      - `booked_amount` (decimal, default 0)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `expense_categories` - Predefined expense categories
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `expenses` - Event expenses
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `category_id` (uuid, references expense_categories)
      - `created_by` (uuid, references auth.users)
      - `description` (text, not null)
      - `amount` (decimal, not null)
      - `receipt_url` (text)
      - `receipt_file_name` (text)
      - `receipt_uploaded_at` (timestamptz)
      - `expense_date` (date, not null)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - ALL authenticated users can view ALL data (shared viewing requirement)
    - Only event creators can modify their events
    - Only expense creators can modify their expenses
    - Auto-create profile on user signup via trigger
  
  3. Storage
    - Create storage bucket for receipt images
    - Allow authenticated users to upload receipts
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  pax INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  booked_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  receipt_url TEXT,
  receipt_file_name TEXT,
  receipt_uploaded_at TIMESTAMP WITH TIME ZONE,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_booked_amount ON public.events(booked_amount);
CREATE INDEX IF NOT EXISTS idx_expenses_event_date ON public.expenses(event_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies - All authenticated users can see all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Events RLS Policies - All authenticated users can see ALL events (shared viewing)
CREATE POLICY "Authenticated users can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Expense Categories - All authenticated users can read
CREATE POLICY "Authenticated users can view all categories"
  ON public.expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- Expenses RLS Policies - All authenticated users can see ALL expenses (shared viewing)
CREATE POLICY "Authenticated users can view all expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_id
    )
  );

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create trigger function for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'staff'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed expense categories
INSERT INTO public.expense_categories (name, description) VALUES
  ('Food & Ingredients', 'Raw ingredients and food items'),
  ('Beverages', 'Drinks and beverages'),
  ('Equipment Rental', 'Rental of plates, glasses, linens, etc.'),
  ('Staff Wages', 'Employee wages and salaries'),
  ('Transportation', 'Delivery and transportation costs'),
  ('Decorations', 'Table decorations and event setup'),
  ('Rentals', 'Venue and equipment rentals'),
  ('Permits & Licenses', 'Event permits and licenses'),
  ('Utilities', 'Gas, electricity, water for event'),
  ('Miscellaneous', 'Other expenses')
ON CONFLICT (name) DO NOTHING;
