-- Seed expense categories for Royal Catering Services
INSERT INTO public.expense_categories (name, description) VALUES
  ('Food & Ingredients', 'Raw ingredients and food items'),
  ('Beverages', 'Drinks and beverages'),
  ('Equipment Rental', 'Rental of plates, glasses, linens, etc.'),
  ('Staff Wages', 'Employee wages and wages'),
  ('Transportation', 'Delivery and transportation costs'),
  ('Decorations', 'Table decorations and event setup'),
  ('Rentals', 'Venue and equipment rentals'),
  ('Permits & Licenses', 'Event permits and licenses'),
  ('Utilities', 'Gas, electricity, water for event'),
  ('Miscellaneous', 'Other expenses')
ON CONFLICT (name) DO NOTHING;
