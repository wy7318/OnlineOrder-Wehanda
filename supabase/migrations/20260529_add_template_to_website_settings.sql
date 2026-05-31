ALTER TABLE public.restaurant_website_settings
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'modern'
    CHECK (template IN ('modern', 'bold', 'minimal', 'classic'));
