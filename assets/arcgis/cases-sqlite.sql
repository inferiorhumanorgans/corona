-- SQLite variant
CREATE TABLE cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city VARCHAR,
  province VARCHAR,
  country VARCHAR,
  updated_at DATETIME NOT NULL,
  sourced_at DATETIME NOT NULL,
  confirmed INTEGER,
  deaths INTEGER,
  recovered INTEGER,
  suspected INTEGER
);
