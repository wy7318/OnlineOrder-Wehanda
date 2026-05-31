-- Platform-level SEO content (single-row table, updated by AI cron twice/month)
create table if not exists public.platform_seo (
  id integer not null default 1,
  meta_title text,
  meta_description text,
  keywords text,
  hero_headline text,
  hero_subheadline text,
  updated_at timestamp with time zone not null default now(),
  constraint platform_seo_pkey primary key (id),
  constraint platform_seo_single_row check (id = 1)
);

alter table public.platform_seo enable row level security;

-- Only service role can read/write (admin client bypasses RLS)
-- No public policies needed — this is internal platform data

insert into public.platform_seo (id) values (1) on conflict (id) do nothing;
