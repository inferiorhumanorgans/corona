#!/usr/bin/env ruby

=begin
  Copyright 2020 Alex Zepeda

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
=end

=begin
In this example we use SQLite, a free database engine available in the public
domain.  SQLite is included with macOS, many Linux distributions, and is
available from https://www.sqlite.org/

To see the growth over time of suspected and confirmed cases:

$ ./scrape.rb fetch
Fetching https://docs.google.com/spreadsheets/d/169AP3oaJZSMTquxtrkgFYMSp4gTApLTTWqo25qCpjL0/export?format=ods
Saving to 2019-ncov-cases-2020-01-26-15-36.ods
$ ./scrape.rb 2019-ncov-cases-2020-01-26-15-36.ods | sqlite3 foo
$ sqlite3 foo 'SELECT SUM(confirmed), SUM(suspected), country, updated_at FROM cases GROUP BY country, updated_at'
0|1|AU|2020-01-23 12:00
1|0|AU|2020-01-25 00:00
4|0|AU|2020-01-25 12:00
4|0|AU|2020-01-25 22:00
4|0|AU|2020-01-26 11:00
0|1|BR|2020-01-23 12:00
1|0|CA|2020-01-26 11:00
327|169|CN|2020-01-22 00:00
549|137|CN|2020-01-22 12:00
639|67|CN|2020-01-23 12:00
865|79|CN|2020-01-24 00:00
916|123|CN|2020-01-24 12:00
1320|37|CN|2020-01-25 00:00
1399|160|CN|2020-01-25 12:00
1979|162|CN|2020-01-25 22:00
2062|139|CN|2020-01-26 11:00
…
=end

require 'rubygems'
require 'net/http'
require 'tempfile'
require 'fileutils'
require 'date'

begin
  require 'roo'
rescue LoadError
  STDERR.puts "Roo doesn't appear to be installed.  Try: gem install roo"
  exit 1
end

# Settings go here

# https://stackoverflow.com/questions/33713084/download-link-for-google-spreadsheets-csv-export-with-multiple-sheets

# DOC_ID="169AP3oaJZSMTquxtrkgFYMSp4gTApLTTWqo25qCpjL0"
DOC_ID="1yZv9w9zRKwrGTaR-YzmAqMefw4wMlaXocejdxZaTs6w"
ODS_FETCH="https://docs.google.com/spreadsheets/d/%{doc_id}/export?format=ods"

# The limitation here is that you can only download one sheet at a time an there is no obvious
# way in which to enumerate the sheets.
CSV_FETCH="https://docs.google.com/spreadsheets/d/%{doc_id}/gviz/tq?tqx=out:csv&sheet=%{sheet_name}"

SCHEMA="CREATE TABLE cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province VARCHAR,
  country VARCHAR,
  updated_at DATETIME NOT NULL,
  confirmed INTEGER,
  deaths INTEGER,
  recovered INTEGER,
  suspected INTEGER
);"

NULL_IS_ZERO = false

# Code

def decode_sheet_name(sheet_name)
  (month, date, hour, ampm) = sheet_name.match(/(\w{3})(\d{1,2})_(\d{1,4})(am|pm)/).captures
  minute = 0
  
  if hour.to_s.length > 2
    (hour, minute) = hour.match(/(\d+)(\d{2})$/).captures
  end
  month = %w(jan feb mar apr may jun jul aug sep oct nov dec).index(month.downcase) + 1
  hour = hour.to_i

  if hour == 12
    if ampm == 'am'
      hour = 0
    end
  elsif ampm == 'pm'
    hour += 12
  end
  # SQLite likes YYYY-MM-DD HH:MM
  "2020-%02d-%02d %02d:%02d" % [month, date, hour, minute]
end

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

def fetch
  Tempfile.create(['ncov-dl', '.ods']) do |temp|
    url = ODS_FETCH % {doc_id: DOC_ID}

    # Let's not use open-uri, blech
    url = URI.parse(url)
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true

    STDERR.puts "Fetching #{url}"
    data = http.get(url.request_uri)

    STDERR.puts "Saving to #{temp.path}"
    temp.write(data.body)

    ods = Roo::Spreadsheet.open(temp.path)
    sheets = ods.sheets

    timestamps = sheets.map do |sheet|
      decode_sheet_name(sheet)
    end

    latest_sheet = timestamps.sort.last

    STDERR.puts "Latest dataset: #{latest_sheet}"

    local_name = DateTime.parse(latest_sheet).strftime("nCoV-2020-%m-%d-%H%M.ods")
    local_name = File.join(Dir.pwd, local_name)

    if File.exists? local_name
      STDERR.puts "#{local_name} appears to exist, exiting."
      exit 1
    end

    STDERR.puts "Renaming to #{local_name}"

    FileUtils.mv(temp.path, local_name)
  end
end

infile = ARGV.first

if infile =~ /^fetch$/i
  fetch()
  exit 0
elsif infile.nil?
  url = ODS_FETCH % {doc_id: DOC_ID}
  STDERR.puts "Input file required.  Latest can be downloaded via: #{$0} fetch"
  exit 1
end

ods = Roo::Spreadsheet.open(infile)

puts "DROP TABLE IF EXISTS cases; #{SCHEMA};"

ods.sheets.each do |sheet_name|
  sheet = ods.sheet(sheet_name)

  timestamp =  decode_sheet_name(sheet_name)

  puts "-- #{timestamp} #{sheet_name}"
  puts "BEGIN;"

  header = sheet.row(sheet.header_line)

  province_idx = nil
  country_idx = nil
  confirmed_idx = nil
  suspected_idx = nil
  deaths_idx = nil
  recovered_idx = nil

  header.each_with_index do |col, i|
    province_idx = i if col =~ /province/i
    country_idx = i if col =~ /country/i
    confirmed_idx = i if col =~ /confirmed/i
    suspected_idx = i if col =~ /suspected/i
    deaths_idx = i if col =~ /deaths/i
    recovered_idx = i if col =~ /recovered/i
  end

  sheet.each_with_index do |row, i|
    next if i == 0
    province = "NULL"
    country = "NULL"
    updated_at = timestamp
    confirmed = "NULL"
    deaths = "NULL"
    recovered = "NULL"
    suspected = "NULL"

    province = "'#{row[province_idx]}'" if province_idx
    province = "NULL" if province == "''"

    confirmed = row[confirmed_idx] if confirmed_idx
    if confirmed.nil?
      if NULL_IS_ZERO
        confirmed = 0 
      else
        confirmed = "NULL"
      end
    end

    suspected = row[suspected_idx] if suspected_idx
    if suspected.nil?
      if NULL_IS_ZERO
        suspected = 0 
      else
        suspected = "NULL"
      end
    end

    deaths = row[deaths_idx] if deaths_idx
    if deaths.nil?
      if NULL_IS_ZERO
        deaths = 0 
      else
        deaths = "NULL"
      end
    end

    recovered = row[recovered_idx] if recovered_idx
    if recovered.nil?
      if NULL_IS_ZERO
        recovered = 0 
      else
        recovered = "NULL"
      end
    end

    if country_idx
      country = get_country_code(row[country_idx], province)
      country = "'#{country}'"
    end

    puts "INSERT INTO cases(province, country, updated_at, confirmed, deaths, recovered, suspected) VALUES(#{province}, #{country}, '#{timestamp}', #{confirmed}, #{deaths}, #{recovered}, #{suspected});"
  end

  puts "COMMIT;"
end
