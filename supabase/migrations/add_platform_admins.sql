-- Platform admins table
-- After running this migration, insert the first admin manually:
--   INSERT INTO public.platform_admins (user_id) VALUES ('your-auth-user-uuid');

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Users can only read their own record (to check if they are admin)
CREATE POLICY "platform_admins_self_read"
  ON public.platform_admins FOR SELECT
  USING (auth.uid() = user_id);
