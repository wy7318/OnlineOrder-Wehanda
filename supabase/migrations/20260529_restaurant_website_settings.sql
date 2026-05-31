CREATE TABLE IF NOT EXISTS public.restaurant_website_settings (
  restaurant_id uuid NOT NULL PRIMARY KEY,
  -- Hero section
  hero_headline text,
  hero_subheadline text,
  -- About section
  about_title text,
  about_body text,
  -- Design
  accent_color text NOT NULL DEFAULT '#037FFC',
  -- Gallery image URLs (owner-uploaded or linked)
  gallery_urls text[] NOT NULL DEFAULT '{}',
  -- SEO (AI-generated or owner-written)
  seo_meta_description text,
  seo_keywords text,
  -- Feature toggles
  show_gallery boolean NOT NULL DEFAULT true,
  show_hours_on_home boolean NOT NULL DEFAULT true,
  show_map_link boolean NOT NULL DEFAULT true,
  -- Optional: Google Analytics tag
  google_analytics_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_website_settings_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);
