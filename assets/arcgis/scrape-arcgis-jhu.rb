#!/usr/bin/env ruby

require "json"
require "date"
require "open-uri"

INFILE = "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=1=1&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=Confirmed%20desc%2CCountry_Region%20asc%2CProvince_State%20asc&outSR=102100&resultOffset=0&resultRecordCount=250&cacheHint=true"

now = DateTime.now
outfile = File.join(ENV['HOME'], "corona", now.strftime("%Y-%m-%dT%H-%M-adj.sql"))
raw_outfile = File.join(ENV['HOME'], "corona", now.strftime("%Y-%m-%dT%H-%M-adj.json"))

# Account for JHU using local east coast time instead of UTC :(
now = (now + (3/24.0)).strftime("%Y-%m-%dT%H:%MZ")

f = URI.open(INFILE)
raw_data = f.read
data = JSON.parse(raw_data)

#STDERR.puts "Outfile: #{outfile}"

# Handle the somewhat arbitrary naming convention JHU picked
# https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes
def get_country_code(country, province)
  case country
  when /(^China$|Mainland China)/i
    case province
    when /Taiwan/i
      return "TW"
    when /Hong Kong/i
      return "HK"
    when /(Macau|Macao)/i
      return "MO"  
    else
      return "CN"
    end
  when /Taiwan/i
    return "TW"
  when /Hong Kong/i
    return "HK"
  when /(Macau|Macao)/i
    return "MO"
  when /(^US$|United States)/i
    return "US"
  when /Japan/i
    return "JP"
  when /Thailand/i
    return "TH"
  when /South Korea/i
    return "KR"
  when /Singapore/i
    return "SG"
  when /(Vietnam|Viet Nam)/i
    return "VN"
  when /France/i
    return "FR"
  when /Australia/i
    return "AU"
  when /Nepal/i
    return "NP"
  when /Malaysia/i
    return "MY"
  when /Canada/i
    return "CA"
  when /Philippines/i
    return "PH"
  when /Mexico/i
    return "MX"
  when /Brazil/i
    return "BR"
  when /Colombia/i
    return "CO"
  when /Cambodia/i
    return "KH"
  when /Sri Lanka/i
    return "LK"
  when /Ivory Coast/i
    return "CI"
  when /Germany/i
    return "DE"
  when /Finland/i
    return "FI"
  when /United Arab Emirates/i
    return "AE"
  when /India/i
    return "IN"
  when /Italy/i
    return "IT"
  when /UK/i
    return "GB"
  when /Russia/i
    return "RU"
  when /Sweden/i
    return "SE"
  when /Spain/i
    return "ES"
  else
    STDERR.puts "Warning: couldn't identify #{country}"
    return country
  end
end

# TODO: Do a proper SQL escape
def esc(s)
  return "'#{s.gsub("'", "''")}'"
end

data = data['features'].reduce([]) do |acc, datum|
  datum = datum['attributes']
  t = datum['Last_Update'].to_i / 1000
  acc.push({
    province: datum['Province_State'],
    country: datum['Country_Region'],
    updated_at: DateTime.strptime(t.to_s, "%s").strftime("%Y-%m-%dT%H:%MZ"),
    confirmed: datum['Confirmed'],
    deaths: datum['Deaths'],
    recovered: datum['Recovered'],
  })

  acc
end

headers = %w(province country updated_at confirmed deaths recovered)
rows = data.map do |row|
  headers.inject([]) do |acc, h|
    acc.push row[h.to_sym]
    acc
  end
end

File.open(raw_outfile, 'w+') do |f|
  f.write(raw_data)
end

File.open(outfile, 'w+') do |f|
  f.puts "-- Fetched at #{now}"
  f.puts "BEGIN;"
  data.each do |row|
    province = row[:province]
    province = province.nil? ? "NULL" : esc(province)

    country = row[:country]
    country = country.nil? ? "NULL": esc(get_country_code(country, row[:province]))

    # Apparently we have quasi-city precision now
    if province.include?(",") and country == "'US'"
      (city, province) = row[:province].split(",", 2).map{|x| x.strip}
      province = province.nil? ? "NULL" : esc(province)
      city = city.nil? ? "NULL" : esc(city)
    else
      city = "NULL"
    end

    updated_at = esc(row[:updated_at])

    confirmed = row[:confirmed]
    confirmed = confirmed.nil? ? "NULL" : confirmed

    deaths = row[:deaths]
    deaths = deaths.nil? ? "NULL" : deaths

    recovered = row[:recovered]
    recovered = recovered.nil? ? "NULL" : recovered

    f.puts "INSERT INTO cases (city, province, country, updated_at, sourced_at, confirmed, deaths, recovered) VALUES(#{city}, #{province}, #{country}, #{esc(now)}, #{updated_at}, #{confirmed}, #{deaths}, #{recovered});"
  end
  f.puts "COMMIT;"
end
