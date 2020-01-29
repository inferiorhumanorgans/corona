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
