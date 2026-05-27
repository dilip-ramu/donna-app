-- ═══════════════════════════════════════════════════════════════════════════
-- DONNA DATABASE SCHEMA v1.0
-- Run this in your Supabase SQL editor, or via: npx supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  timezone      text NOT NULL DEFAULT 'UTC',
  preferences   jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarded_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','completed','archived')),
  color         text,
  icon          text,
  priority      text NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('critical','high','medium','low','someday')),
  due_date      date,
  ai_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INBOX ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inbox_items (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_content   text NOT NULL,
  source        text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual','voice','email','api')),
  status        text NOT NULL DEFAULT 'unprocessed'
                  CHECK (status IN ('unprocessed','processing','processed','dismissed')),
  processed_at  timestamptz,
  promoted_to   text,
  promoted_id   uuid,
  ai_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  parent_task_id  uuid REFERENCES tasks(id) ON DELETE CASCADE,
  title           text NOT NULL,
  notes           text,
  status          text NOT NULL DEFAULT 'inbox'
                    CHECK (status IN ('inbox','active','in_progress','blocked','done','archived')),
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low','someday')),
  due_date        date,
  due_time        time,
  is_hard_deadline boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  recurrence_next date,
  completed_at    timestamptz,
  context_tags    text[] NOT NULL DEFAULT '{}',
  ai_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- IDEAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  idea_type     text NOT NULL DEFAULT 'general'
                  CHECK (idea_type IN ('app','feature','business','process','creative','research','general')),
  status        text NOT NULL DEFAULT 'raw'
                  CHECK (status IN ('raw','refined','validated','shelved','building','shipped')),
  potential     text CHECK (potential IN ('high','medium','low')),
  tags          text[] NOT NULL DEFAULT '{}',
  ai_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MEETINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  title           text NOT NULL,
  meeting_date    date,
  start_time      time,
  end_time        time,
  location        text,
  attendees       text[] NOT NULL DEFAULT '{}',
  raw_notes       text,
  summary         text,
  decisions       text[] NOT NULL DEFAULT '{}',
  open_questions  text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  ai_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REMINDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type     text,
  entity_id       uuid,
  title           text NOT NULL,
  notes           text,
  remind_at       timestamptz NOT NULL,
  recurrence_rule text,
  recurrence_next timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','snoozed','dismissed','triggered')),
  triggered_at    timestamptz,
  ai_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,
  entity_id     uuid,
  title         text NOT NULL,
  event_date    date NOT NULL,
  start_time    time,
  end_time      time,
  is_all_day    boolean NOT NULL DEFAULT false,
  color         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  phone         text,
  company       text,
  role          text,
  notes         text,
  tags          text[] NOT NULL DEFAULT '{}',
  ai_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  file_type       text,
  storage_path    text NOT NULL,
  storage_bucket  text NOT NULL DEFAULT 'documents',
  file_size_bytes integer,
  mime_type       text,
  extracted_text  text,
  tags            text[] NOT NULL DEFAULT '{}',
  ai_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  title         text,
  content       text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  is_pinned     boolean NOT NULL DEFAULT false,
  ai_metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITY LINKS (relationship graph)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_links (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type   text NOT NULL,
  source_id     uuid NOT NULL,
  target_type   text NOT NULL,
  target_id     uuid NOT NULL,
  relationship  text NOT NULL,
  created_by    text NOT NULL DEFAULT 'user' CHECK (created_by IN ('user','ai')),
  strength      float NOT NULL DEFAULT 1.0,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, target_type, target_id, relationship)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACTIVITY LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,
  entity_id     uuid NOT NULL,
  action        text NOT NULL,
  actor         text NOT NULL DEFAULT 'user' CHECK (actor IN ('user','ai','system')),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TAGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  color         text,
  entity_types  text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_status   ON tasks(user_id, status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date       ON tasks(user_id, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project        ON tasks(project_id)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent         ON tasks(parent_task_id)    WHERE deleted_at IS NULL;

-- Inbox
CREATE INDEX IF NOT EXISTS idx_inbox_user_status   ON inbox_items(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inbox_created_at    ON inbox_items(user_id, created_at DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user       ON projects(user_id, status) WHERE deleted_at IS NULL;

-- Ideas
CREATE INDEX IF NOT EXISTS idx_ideas_user_status   ON ideas(user_id, status) WHERE deleted_at IS NULL;

-- Meetings
CREATE INDEX IF NOT EXISTS idx_meetings_user_date  ON meetings(user_id, meeting_date) WHERE deleted_at IS NULL;

-- Reminders
CREATE INDEX IF NOT EXISTS idx_reminders_due       ON reminders(user_id, remind_at) WHERE status = 'pending';

-- Entity links
CREATE INDEX IF NOT EXISTS idx_links_source        ON entity_links(user_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_links_target        ON entity_links(user_id, target_type, target_id);

-- Calendar
CREATE INDEX IF NOT EXISTS idx_calendar_date       ON calendar_events(user_id, event_date);

-- Activity
CREATE INDEX IF NOT EXISTS idx_activity_entity     ON activity_log(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_date  ON activity_log(user_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_tasks_updated_at      BEFORE UPDATE ON tasks      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated_at   BEFORE UPDATE ON projects   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_ideas_updated_at      BEFORE UPDATE ON ideas      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_meetings_updated_at   BEFORE UPDATE ON meetings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_inbox_updated_at      BEFORE UPDATE ON inbox_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
