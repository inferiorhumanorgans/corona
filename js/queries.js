class Queries {
}

Queries.ALL_REGIONS = `
  SELECT
    updated_at AS x_label,
    SUM(CASE WHEN region = 'china' THEN count END) as china,
    SUM(CASE WHEN region = 'east_asia' THEN count END) as east_asia,
    SUM(CASE WHEN region = 'southeast_asia' THEN count END) as southeast_asia,
    SUM(CASE WHEN region = 'central_asia' THEN count END) as central_asia,
    SUM(CASE WHEN region = 'south_asia' THEN count END) as south_asia,
    SUM(CASE WHEN region = 'middle_east' THEN count END) as middle_east,
    SUM(CASE WHEN region = 'north_america' THEN count END) as north_america,
    SUM(CASE WHEN region = 'south_america' THEN count END) as south_america,
    SUM(CASE WHEN region = 'central_europe' THEN count END) as central_europe,
    SUM(CASE WHEN region = 'western_europe' THEN count END) as western_europe,
    SUM(CASE WHEN region = 'eastern_europe' THEN count END) as eastern_europe,
    SUM(CASE WHEN region = 'northern_europe' THEN count END) as northern_europe,
    SUM(CASE WHEN region = 'southern_europe' THEN count END) as southern_europe,
    SUM(CASE WHEN region = 'other' THEN count END) as other
  FROM (
    SELECT
      updated_at,
      SUM(IFNULL(%{category}, 0)) AS count,
      IFNULL(region, 'other') AS region
    FROM cases, iso_countries
    WHERE
      iso_countries.alpha_2 = country AND
      (
        (
          updated_at < '2020-02-01 20:00' OR
          ((STRFTIME('%H', updated_at) % 4 = 0) AND (STRFTIME('%M', updated_at) = '30'))
        ) OR
        updated_at = (SELECT MAX(updated_at) FROM cases)
      )
    GROUP BY updated_at, region
    ORDER BY updated_at ASC, region ASC
  )
  GROUP BY updated_at
  `

Queries.CHINA_PROVINCIAL = `
  SELECT
    x_label,
    province,
    confirmed,
    suspected,
    recovered,
    deaths,
    known,
    CASE
      WHEN known IS NOT NULL THEN
        (CAST(IFNULL(deaths, 0) AS REAL) / CAST(known AS REAL))
      ELSE
        NULL
    END AS death_ratio
  FROM
    ( SELECT
      updated_at AS x_label,
      province,
      confirmed,
      suspected,
      recovered,
      deaths,
      CASE
        WHEN deaths IS NULL AND recovered IS NULL THEN NULL
        ELSE (IFNULL(deaths, 0) + IFNULL(recovered, 0))
      END AS known
    FROM cases
    WHERE
      country = 'CN'
      -- If we comment this out and keep all the twice hourly updates
      -- we get smaller bins and a little more precision as a result
      AND
      ((updated_at < '2020-02-01 20:00' OR STRFTIME('%M', updated_at) = '00') OR updated_at = (SELECT MAX(updated_at) FROM cases))
    ORDER BY updated_at
  )
`

Queries.CHINA_REGIONAL = `
  SELECT
    updated_at AS x_label,
    SUM(CASE WHEN region = 'north_china' THEN count END) as north_china,
    SUM(CASE WHEN region = 'northeast_china' THEN count END) as northeast_china,
    SUM(CASE WHEN region = 'east_china' THEN count END) as east_china,
    SUM(CASE WHEN region = 'south_central_china' THEN count END) as south_central_china,
    SUM(CASE WHEN region = 'southwest_china' THEN count END) as southwest_china,
    SUM(CASE WHEN region = 'northwest_china' THEN count END) as northwest_china
  FROM (
    SELECT
      country,
      updated_at,
      SUM(IFNULL(%{category}, 0)) AS count,
      region
    FROM cases, china_provinces
    WHERE
      country = 'CN' AND
      province = china_provinces.name AND
      (
        (
          updated_at < '2020-02-01 20:00' OR
          ((STRFTIME('%H', updated_at) % 4 = 0) AND (STRFTIME('%M', updated_at) = '30'))
        ) OR
        updated_at = (SELECT MAX(updated_at) FROM cases)
      )
    GROUP BY updated_at, region
    ORDER BY updated_at ASC, region ASC)
  GROUP BY updated_at
  `

Queries.EUROPE_BY_COUNTRY = `
  SELECT
    x_label,
    country AS name,
    province,
    confirmed,
    suspected,
    recovered,
    deaths,
    known,
    CASE
      WHEN known IS NOT NULL THEN
        (CAST(IFNULL(deaths, 0) AS REAL) / CAST(known AS REAL))
      ELSE
        NULL
    END AS death_ratio
  FROM
    (
      SELECT
        updated_at AS x_label,
        country,
        CASE
        WHEN country = 'AL' THEN	'Albania'
        WHEN country = 'AD' THEN	'Andorra'
        WHEN country = 'AM' THEN	'Armenia'
        WHEN country = 'AT' THEN	'Austria'
        WHEN country = 'AZ' THEN	'Azerbaijan'
        WHEN country = 'BY' THEN	'Belarus'
        WHEN country = 'BE' THEN	'Belgium'
        WHEN country = 'BA' THEN	'Bosnia and Herzegovina'
        WHEN country = 'BG' THEN	'Bulgaria'
        WHEN country = 'HR' THEN	'Croatia'
        WHEN country = 'CY' THEN	'Cyprus'
        WHEN country = 'CZ' THEN	'Czechia'
        WHEN country = 'DK' THEN	'Denmark'
        WHEN country = 'EE' THEN	'Estonia'
        WHEN country = 'FI' THEN	'Finland'
        WHEN country = 'FR' THEN	'France'
        WHEN country = 'GE' THEN	'Georgia'
        WHEN country = 'DE' THEN	'Germany'
        WHEN country = 'GR' THEN	'Greece'
        WHEN country = 'HU' THEN	'Hungary'
        WHEN country = 'IS' THEN	'Iceland'
        WHEN country = 'IE' THEN	'Ireland'
        WHEN country = 'IT' THEN	'Italy'
        WHEN country = 'KZ' THEN	'Kazakhstan'
        WHEN country = 'Kosovo' THEN	'Kosovo'
        WHEN country = 'LV' THEN	'Latvia'
        WHEN country = 'LI' THEN	'Liechtenstein'
        WHEN country = 'LT' THEN	'Lithuania'
        WHEN country = 'LU' THEN	'Luxembourg'
        WHEN country = 'MT' THEN	'Malta'
        WHEN country = 'MD' THEN	'Moldova'
        WHEN country = 'MC' THEN	'Monaco'
        WHEN country = 'ME' THEN	'Montenegro'
        WHEN country = 'NL' THEN	'Netherlands'
        WHEN country = 'MK' THEN	'Macedonia'
        WHEN country = 'NO' THEN	'Norway'
        WHEN country = 'PL' THEN	'Poland'
        WHEN country = 'PT' THEN	'Portugal'
        WHEN country = 'RO' THEN	'Romania'
        WHEN country = 'RU' THEN	'Russia'
        WHEN country = 'SM' THEN	'San Marino'
        WHEN country = 'RS' THEN	'Serbia'
        WHEN country = 'SK' THEN	'Slovakia'
        WHEN country = 'SI' THEN	'Slovenia'
        WHEN country = 'ES' THEN	'Spain'
        WHEN country = 'SE' THEN	'Sweden'
        WHEN country = 'CH' THEN	'Switzerland'
        WHEN country = 'TR' THEN	'Turkey'
        WHEN country = 'UA' THEN	'Ukraine'
        WHEN country = 'GB' THEN	'United Kingdom'
        WHEN country = 'VA' THEN	'Vatican City'
        END AS province,
        confirmed,
        suspected,
        recovered,
        deaths,
        CASE
          WHEN deaths IS NULL AND recovered IS NULL THEN NULL
          ELSE (IFNULL(deaths, 0) + IFNULL(recovered, 0))
        END AS known
      FROM cases
      WHERE
        country IN ('AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'VA', 'DE') AND
        (
          (
            updated_at < '2020-02-01 20:00' OR
            (STRFTIME('%M', updated_at) = '30')
          ) OR
          updated_at = (SELECT MAX(updated_at) FROM cases)
        )
      ORDER BY updated_at
    )
`

Queries.ALL_COUNTRIES = `
  SELECT
    x_label,
    country AS name,
    SUM(confirmed) AS confirmed,
    SUM(suspected) AS suspected,
    SUM(recovered) AS recovered,
    SUM(deaths) AS deaths
  FROM
    (
      SELECT
        updated_at AS x_label,
        country,
        confirmed,
        suspected,
        recovered,
        deaths
      FROM cases
      WHERE
      (
        (
          updated_at < '2020-02-01 20:00' OR
          (STRFTIME('%M', updated_at) = '30')
        ) OR
        updated_at = (SELECT MAX(updated_at) FROM cases)
      )
    ORDER BY updated_at
    )
  GROUP BY x_label, country;
`

Queries.PROPORTIONS = `
  SELECT
    CASE
      WHEN country IN ('TW', 'HK', 'MO') THEN iso_countries.name
      WHEN country = 'ZZ' THEN province
      WHEN province IS NULL THEN iso_countries.name
      ELSE province || ', ' || country
    END AS locale,
    country,
    province,
    SUM(IFNULL(confirmed, 0)) AS confirmed,
    SUM(IFNULL(deaths, 0)) AS deaths,
    SUM(IFNULL(recovered, 0)) AS recovered,
    (confirmed - deaths - recovered) AS unknown
  FROM cases, iso_countries
  WHERE
    updated_at = (SELECT MAX(updated_at) FROM cases) AND
    iso_countries.alpha_2 = country
  GROUP BY country, province
  ORDER BY iso_countries.name ASC, province ASC;
`
