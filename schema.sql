-- Everything people send from the page. Nothing is public until status = 'approved'.
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('paint', 'story', 'code', 'idea')),
  plot_id TEXT,
  x INTEGER, y INTEGER, w INTEGER, h INTEGER,
  pixels TEXT,
  handle TEXT NOT NULL,
  title TEXT,
  body TEXT,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  auto INTEGER NOT NULL DEFAULT 0, -- 1 = a first contribution that went live without review
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS contributions_status ON contributions (status);
CREATE INDEX IF NOT EXISTS contributions_ip ON contributions (ip_hash, created_at);
