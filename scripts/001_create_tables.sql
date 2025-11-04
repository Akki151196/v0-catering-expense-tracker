-- Create tables for Royal Catering Services Expense Tracker

-- Users table (references Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'staff', 'viewer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Events RLS Policies
CREATE POLICY "events_select_own" ON public.events FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "events_update_own" ON public.events FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "events_delete_own" ON public.events FOR DELETE USING (created_by = auth.uid());

-- Expense Categories - readable by all
CREATE POLICY "categories_select_all" ON public.expense_categories FOR SELECT USING (TRUE);

-- Expenses RLS Policies
CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = expenses.event_id AND events.created_by = auth.uid()
  ));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_id AND events.created_by = auth.uid()
  ));
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = expenses.event_id AND events.created_by = auth.uid()
  ));
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = expenses.event_id AND events.created_by = auth.uid()
  ));

-- Create trigger function for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
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
