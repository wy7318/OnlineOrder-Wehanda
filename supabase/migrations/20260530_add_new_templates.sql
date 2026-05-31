-- Add 4 new template options: noir, organic, electric, zen
-- Must drop and recreate the CHECK constraint since PostgreSQL doesn't support ALTER CONSTRAINT

ALTER TABLE public.restaurant_website_settings
  DROP CONSTRAINT IF EXISTS restaurant_website_settings_template_check;

ALTER TABLE public.restaurant_website_settings
  ADD CONSTRAINT restaurant_website_settings_template_check
  CHECK (template IN ('modern', 'bold', 'minimal', 'classic', 'noir', 'organic', 'electric', 'zen'));
