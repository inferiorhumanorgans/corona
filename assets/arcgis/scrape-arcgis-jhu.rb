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

puts INFILE.inspect if ENV['DEBUG']

f = URI.open(INFILE)
raw_data = f.read
data = JSON.parse(raw_data)

#STDERR.puts "Outfile: #{outfile}"

# data = JSON.parse(File.read('out-last.json'))

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
  when /(Cote d'Ivoire|Ivory Coast)/i
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
  when /Belgium/i
    return "BE"
  when /(Other|Others)/i
    return "ZZ"
  when /Egypt/i
    return "EG"
  when /Diamond Princess/i
    return "ZZ"
  when /Iran/i
    return "IR"
  when /Israel/i
    return "IL"
  when /Lebanon/i
    return "LB"
  when /Iraq/i
    return "IQ"
  when /Kuwait/i
    return "KW"
  when /Oman/i
    return "OM"
  when /Afghanistan/i
    return "AF"
  when /Bahrain/i
    return "BH"
  when /Austria/i
    return "AT"
  when /Croatia/i
    return "HR"
  when /Switzerland/i
    return "CH"
  when /Algeria/i
    return "DZ"
  when /Pakistan/i
    return "PK"
  when /Georgia/i
    return "GE"
  when /Greece/i
    return "GR"
  when /North Macedonia/i
    return "MK"
  when /Norway/i
    return "NO"
  when /Denmark/i
    return "DK"
  when /Estonia/i
    return "EE"
  when /Netherlands/i
    return "NL"
  when /San Marino/i
    return "SM"
  when /Belarus/i
    return "BY"
  when /Lithuania/i
    return "LT"
  when /New Zealand/i
    return "NZ"
  when /Nigeria/
    return "NG"
  when /North Ireland/i
    return "GB"
  when /Azerbaijan/i
    return "AZ"
  when /Iceland/i
    return "IS"
  when /Monaco/i
    return "MC"
  when /Ireland/i
    return "IE"
  when /Luxembourg/i
    return "LU"
  when /Qatar/i
    return "QA"
  when /Ecuador/i
    return "EC"
  when /Dominican Republic/i
    return "DO"
  when /Armenia/i
    return "AM"
  when /Indonesia/i
    return "ID"
  when /Czech Republic/i
    return "CZ"
  when /Portugal/i
    return "PT"
  when /Andorra/i
    return "AD"
  when /Latvia/i
    return "LV"
  when /Morocco/i
    return "MA"
  when /Saudi Arabia/i
    return "SA"
  when /Senegal/i
    return "SN"
  when /Jordan/i
    return "JO"
  when /Argentina/i
    return "AR"
  when /Chile/i
    return "CL"
  when /Palestine/i
    return "PS"
  when /Saint Barthelemy/i
    return "BL"
  when /Bosnia and Herzegovina/i
    return "BA"
  when /Hungary/i
    return "HU"
  when /Slovenia/i
    return "SI"
  when /Faroe Islands/i
    return "FO"
  when /Gibraltar/i
    return "GI"
  when /Liechtenstein/i
    return "LI"
  when /Poland/i
    return "PL"
  when /South Africa/i
    return "ZA"
  when /Tunisia/i
    return "TN"
  when /Bhutan/i
    return "BT"
  when /Costa Rica/i
    return "CR"
  when /(Fench|French) Guiana/i
    return "GF"
  when /Martinique/i
    return "MQ"
  when /Cameroon/i
    return "CM"
  when /Peru/i
    return "PE"
  when /Serbia/i
    return "RS"
  when /Slovakia/i
    return "SK"
  when /Togo/i
    return "TG"
  when /(Holy See|Vatican City)/i
    return "VA"
  when /Malta/i
    return "MT"
  when /Paraguay/i
    return "PY"
  when /Bulgaria/i
    return "BG"
  when /Bangladesh/i
    return "BD"
  when /Maldives/i
    return "MV"
  when /Moldova/i
    return "MD"
  when /Albania/i
    return "AL"
  when /(St\. Martin|Saint Martin)/i
    return "MF"
  when /Republic of Korea/i
    return "KP"
  when /Taipei and environs/i
    return "TW"
  when /occupied Palestinian territory/i
    return "PS"
  when /Cyprus/i
    return "CY"
  when /Brunei/i
    return "BN"
  when /Burkina Faso/i
    return "BF"
  when /Channel Islands/i
    return "GB"
  when /Mongolia/i
    return "MN"
  when /Panama/i
    return "PA"
  when /Bolivia/i
    return "BO"
  when /Turkey/i
    return "TR"
  when /Jamaica/i
    return "JM"
  when /Korea, South/i
    return "KR"
  when /"Korea; South"/i
    return "KR"
  when /United Kingdom/i
    return "GB"
  when /Czechia/i
    return "CZ"
  when /Honduras/i
    return "HN"
  when /Congo \(Kinshasa\)/i
    return "CD"
  when /Democratic Republic of the Congo/i
    return "CD"
  when /Cruise Ship/i
    return "ZZ"
  when /Reunion/i
    return "RE"
  when /Cuba/i
    return "CU"
  when /Kazakhstan/i
    return "KZ"
  when /Aruba/i
    return "AW"
  when /Ghana/i
    return "GH"
  when /Antigua and Barbuda/i
    return "AG"
  when /Cayman Islands/i
    return "KY"
  when /Ethiopia/i
    return "ET"
  when /French Polynesia/i
    return "PF"
  when /Gabon/i
    return "GA"
  when /Guadeloupe/i
    return "GP"
  when /Guernsey/i
    return "GG"
  when /Papua New Guinea/i
    return "PG"
  when "Guinea"
    return "GN"
  when /Guyana/i
    return "GY"
  when /Kenya/i
    return "KE"
  when /South Sudan/i
    return "SS"
  when "Sudan"
    return "SD"
  when /Trinidad and Tobago/i
    return "TT"
  when /Venezuela/i
    return "VE"
  when /Guatemala/i
    return "GT"
  when /Uruguay/i
    return "UY"
  when /Puerto Rico/i
    return "US"
  when /Suriname/i
    return "SR"
  when /Saint Vincent and the Grenadines/i
    return "VC"
  when /Saint Lucia/i
    return "LC"
  when /Rwanda/i
    return "RW"
  when /Mauritania/i
    return "MR"
  when /Eswatini/i
    return "SZ"
  when /Curacao/i
    return "CW"
  when /Namibia/i
    return "NA"
  when "Jersey"
    return "JE"
  else
    STDERR.puts "Warning: couldn't identify #{country}"
    return country
  end
end

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
    if row[:country] =~ /Diamond Princess/i
      province = "'\"Diamond Princess\" cruise ship'"
    end

    if row[:country] =~ /North Ireland/
      province = "'North Ireland'"
    end

    if row[:country] =~ /Taipei and environs/
      province = "'Taipei'"
    end

    if row[:country] =~ /Channel Islands/
      province = "'Channel Islands'"
    end

    if row[:country] =~ /Cruise Ship/i
      province = "'Cruise Ship'"
    end

    if row[:country] =~ /Puerto Rico/i
      province = "'Puerto Rico'"
    end

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
