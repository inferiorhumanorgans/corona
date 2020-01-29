run:
	python -m SimpleHTTPServer 8888
topo:
	ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('CHN')" ne_10m_admin_0_countries/china-border-geo.json ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp
	ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('CHN') AND name_loc_l IS NOT NULL AND name_loc_r IS NOT NULL" ne_10m_admin_1_states_provinces_lines/china-province-geo.json ne_10m_admin_1_states_provinces_lines/ne_10m_admin_1_states_provinces_lines.shp
	topojson -o dist/china-topo.json --properties name=NAME ne_10m_admin_1_states_provinces_lines/china-province-geo.json ne_10m_admin_0_countries/china-border-geo.json
