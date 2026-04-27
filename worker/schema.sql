CREATE TABLE IF NOT EXISTS files (
  id             TEXT PRIMARY KEY,
  filename       TEXT NOT NULL,
  author         TEXT,
  size           INTEGER NOT NULL,
  mime           TEXT NOT NULL DEFAULT 'application/pdf',
  uploaded_at    TEXT NOT NULL,
  is_18_plus     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published',
  hashtags_json  TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_status      ON files (status);
CREATE INDEX IF NOT EXISTS idx_files_18_plus     ON files (is_18_plus);

CREATE TABLE IF NOT EXISTS hashtags (
  tag   TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
