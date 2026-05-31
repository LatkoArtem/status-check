-- ============================================================
-- Initial Schema Migration
-- Status Check App
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE public.commitment_status AS ENUM (
  'to_check',
  'expired',
  'done',
  'not_actual',
  'ideas_backlog'
);

CREATE TYPE public.user_role AS ENUM ('admin', 'member');

-- ============================================================
-- Tables
-- ============================================================

-- profiles: extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       public.user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#3B82F6',
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- commitments
CREATE TABLE IF NOT EXISTS public.commitments (
  id                      UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT                    NOT NULL,
  description             TEXT,
  author_id               UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id              UUID                    REFERENCES public.projects(id) ON DELETE SET NULL,
  responsible_executor_id UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_checker_id  UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline                TIMESTAMPTZ             NOT NULL,
  status                  public.commitment_status NOT NULL DEFAULT 'to_check',
  created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_by              UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commitment_id UUID        REFERENCES public.commitments(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  is_read       BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- projects policies
CREATE POLICY "projects_select_authenticated"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_insert_admin"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "projects_update_admin"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "projects_delete_admin"
  ON public.projects FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- commitments policies
CREATE POLICY "commitments_select_authenticated"
  ON public.commitments FOR SELECT TO authenticated USING (true);

CREATE POLICY "commitments_insert_authenticated"
  ON public.commitments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "commitments_update_own_or_admin"
  ON public.commitments FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "commitments_delete_own_or_admin"
  ON public.commitments FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- notifications policies
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_service_role"
  ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-create profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on commitments
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER commitments_updated_at
  BEFORE UPDATE ON public.commitments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- pg_cron Jobs
-- ============================================================

-- Auto-expire commitments past their deadline every 5 minutes
SELECT cron.schedule(
  'auto-expire-commitments',
  '*/5 * * * *',
  $$
    UPDATE public.commitments
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'to_check' AND deadline < NOW();
  $$
);

-- Note: deadline-notifications cron job (hourly HTTP call to Edge Function)
-- is configured after deploy via Supabase dashboard or:
-- SELECT cron.schedule('deadline-notifications', '0 * * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.edge_function_url') || '/send-deadline-emails',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key')),
--     body := '{}'::jsonb
--   );
-- $$);

-- ============================================================
-- Realtime
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'commitments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commitments;
  END IF;
END $$;
