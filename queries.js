class Queries {
}

Queries.ALL_REGIONS = `
    SELECT updated_at AS x_label,
      SUM(IFNULL(recovered,0)) AS recovered,
      SUM(IFNULL(deaths,0)) AS deaths,
      SUM(IFNULL(confirmed, 0)) AS confirmed
    FROM cases
    GROUP BY x_label
    ORDER BY x_label;`

Queries.CHINA_PROVINCIAL = `
  SELECT
    x_label,
    province,
    confirmed,
    suspected,
    recovered,
    deaths,
    known,
    (CAST(deaths AS REAL) / CAST(known AS REAL)) AS death_ratio
  FROM
    ( SELECT
      updated_at AS x_label,
      province,
      IFNULL(confirmed, 0) AS confirmed,
      IFNULL(suspected, 0) AS suspected,
      IFNULL(recovered, 0) AS recovered,
      IFNULL(deaths, 0) AS deaths,
      (IFNULL(deaths, 0) + IFNULL(recovered, 0)) AS known
    FROM cases
    WHERE country = 'CN'
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
      SUM(IFNULL(confirmed, 0)) AS count,
      CASE
        WHEN province IN ('Beijing', 'Tianjin', 'Hebei', 'Shanxi', 'Inner Mongolia') THEN
          'north_china'
        WHEN province IN ('Liaoning', 'Jilin', 'Heilongjiang') THEN
          'northeast_china'
        WHEN province IN ('Shanghai', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong') THEN
          'east_china'
        WHEN province IN ('Henan', 'Hubei', 'Hunan', 'Guangdong', 'Guangxi', 'Hainan') THEN
          'south_central_china'
        WHEN province IN ('Chongqing', 'Sichuan', 'Guizhou', 'Yunnan', 'Tibet') THEN
          'southwest_china'
        WHEN province IN ('Shaanxi', 'Gansu', 'Qinghai', 'Ningxia', 'Xinjiang') THEN
          'northwest_china'
        ELSE
          province
        END region
    FROM cases WHERE country = 'CN'
    GROUP BY updated_at, region
    ORDER BY updated_at ASC, region ASC)
  GROUP BY updated_at
  `
Queries.EUROPE_BY_COUNTRY = `
  SELECT
    x_label,
    province,
    confirmed,
    suspected,
    recovered,
    deaths,
    known,
    (CAST(deaths AS REAL) / CAST(known AS REAL)) AS death_ratio
  FROM
    (
      SELECT
        updated_at AS x_label,
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
        IFNULL(confirmed, 0) AS confirmed,
        IFNULL(suspected, 0) AS suspected,
        IFNULL(recovered, 0) AS recovered,
        IFNULL(deaths, 0) AS deaths,
        (IFNULL(deaths, 0) + IFNULL(recovered, 0)) AS known
      FROM cases
      WHERE country IN ('AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GE', 'GR', 'HU', 'IS', 'IE', 'IT', 'KZ', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'VA')
      ORDER BY updated_at
    )
`
