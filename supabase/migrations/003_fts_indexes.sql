-- ═══════════════════════════════════════════════════════════════════════════
-- FULL-TEXT SEARCH — generated columns + GIN indexes
-- ═══════════════════════════════════════════════════════════════════════════

-- inbox_items
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(raw_content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_inbox_fts ON inbox_items USING GIN(fts);

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(notes, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON tasks USING GIN(fts);

-- ideas
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_ideas_fts ON ideas USING GIN(fts);

-- meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(raw_notes, '') || ' ' ||
      coalesce(summary, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_meetings_fts ON meetings USING GIN(fts);

-- notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING GIN(fts);

-- projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING GIN(fts);

-- documents (title + extracted_text when OCR available)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(extracted_text, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN(fts);

-- Trigram indexes for fuzzy/prefix search on titles
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm     ON tasks    USING GIN(title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_title_trgm     ON ideas    USING GIN(title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm  ON projects USING GIN(title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_title_trgm  ON meetings USING GIN(title gin_trgm_ops) WHERE deleted_at IS NULL;
