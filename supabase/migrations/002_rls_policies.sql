-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — users only see their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags            ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_own" ON profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- inbox_items
CREATE POLICY "inbox_own" ON inbox_items
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- projects
CREATE POLICY "projects_own" ON projects
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tasks
CREATE POLICY "tasks_own" ON tasks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ideas
CREATE POLICY "ideas_own" ON ideas
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meetings
CREATE POLICY "meetings_own" ON meetings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reminders
CREATE POLICY "reminders_own" ON reminders
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- calendar_events
CREATE POLICY "calendar_own" ON calendar_events
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contacts
CREATE POLICY "contacts_own" ON contacts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- documents
CREATE POLICY "documents_own" ON documents
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notes
CREATE POLICY "notes_own" ON notes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entity_links
CREATE POLICY "links_own" ON entity_links
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_log (read-only via RLS; writes via service role only)
CREATE POLICY "activity_read_own" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- tags
CREATE POLICY "tags_own" ON tags
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
