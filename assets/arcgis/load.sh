#!/bin/sh

# Batch load, should be made smarter
# to do incremental loading…

for i in 2020*.sql; do ./import.sh $i; done
