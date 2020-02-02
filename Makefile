# GNU Make special…

.PHONY: dist assets fetch fetch-do fetch-process

run:
	python -m SimpleHTTPServer 8888

topo:
	ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('CHN')" ne_10m_admin_0_countries/china-border-geo.json ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp
	ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('CHN') AND name_loc_l IS NOT NULL AND name_loc_r IS NOT NULL" ne_10m_admin_1_states_provinces_lines/china-province-geo.json ne_10m_admin_1_states_provinces_lines/ne_10m_admin_1_states_provinces_lines.shp
	topojson -o dist/china-topo.json --properties name=NAME ne_10m_admin_1_states_provinces_lines/china-province-geo.json ne_10m_admin_0_countries/china-border-geo.json

dist: sql_source := $(shell ls assets/data/*.sqlite3 | sort | tail -1)
dist: assets
	@echo "Looking for newest SQL data"
	@echo "Copying SQL '$(sql_source)'"
	@cp $(sql_source) data/nCoV.sqlite3
	@echo "Appending metadata"
	@sqlite3 data/nCoV.sqlite3 < assets/geo/meta/iso.sql

assets:
	@echo "Generating stylesheet"
	@sass assets/styles/index.scss styles.css

fetch: fetch-do fetch-process

fetch-do:
	@cd assets/data && ../tools/scrape.rb fetch

fetch-process: dataset := $(shell basename $$(ls assets/data/*.ods | sort | tail -1) .ods)
fetch-process:
	@echo "Converting ODS to SQLite3 DB"
	@assets/tools/scrape.rb assets/data/$(dataset).ods | sqlite3 assets/data/$(dataset).sqlite3
