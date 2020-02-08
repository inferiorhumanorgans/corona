-- Postgres variant
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  city VARCHAR,
  province VARCHAR,
  country VARCHAR,
  updated_at TIMESTAMP NOT NULL,
  sourced_at TIMESTAMP NOT NULL,
  confirmed INTEGER,
  deaths INTEGER,
  recovered INTEGER,
  suspected INTEGER
);
