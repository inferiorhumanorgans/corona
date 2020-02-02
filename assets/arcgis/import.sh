#!/bin/sh

# Takes our last Google doc based DB and
# appends a data file scraped from ArcGIS

if [ x"$1" = "x" ]; then
  echo "Need source file"
  exit 1
fi

if [ "$1" = "2020-02-01T18-30.sql" ]; then
  echo "Skipping ${1}"
  exit
fi

INFILE=$1

echo ${INFILE}
cat ${INFILE} | sed -E 's/T([0-9]{2}:[0-9]{2})Z/ \1/g' | sqlite3 nCoV-2020-02-01-1800.sqlite3
