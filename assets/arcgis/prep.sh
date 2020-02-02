#!/bin/sh

# Preps our last Google doc DB

cp ../assets/data/nCoV-2020-02-01-1800.sqlite3 .
sqlite3 nCoV-2020-02-01-1800.sqlite3 < ../assets/geo/meta/iso.sql
echo "ALTER TABLE cases ADD COLUMN sourced_at DATETIME" | sqlite3 nCoV-2020-02-01-1800.sqlite3
echo "ALTER TABLE cases ADD COLUMN city VARCHAR" | sqlite3 nCoV-2020-02-01-1800.sqlite3
