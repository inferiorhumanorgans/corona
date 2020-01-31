function formatNumber(number, options) {
  return new Intl.NumberFormat(SETTINGS.locale, options).format(number)
}

function format_series(s) {
  switch (s) {
    case "north_china":
      return "North China (华北)"
    case "northeast_china":
      return "Northeast China (东北)"
    case "east_china":
      return "East China (华东)"
    case "south_central_china":
      return "South Central China (中南)"
    case "southwest_china":
      return "Southwest China (西南)"
    case "northwest_china":
      return "Northwest China (西北)"
    default:
      return s
  }
}

class Database {
  constructor(path) {
    this.db_path = path
    this.db = null
    this.sql_config = {
      locateFile: filename => `./dist/${filename}`
    }
  }

  load_data() {
    if (typeof(this.db_path) === "undefined") {
      console.error("[Databse:]", "Source DB file not defined")
      return
    }
    
    return fetch(this.db_path)
      .then((response) => {
        return response.arrayBuffer()
      })
      .then((response_data) => {
        let self = this
        return initSqlJs(self.sql_config).then(function(SQL){
          self.db = new SQL.Database(new Uint8Array(response_data));
          return true
        });
      })
      .catch((error) => {
        console.error("[Database:]", error);
      });
  }

  query(sql_query) {
    let result_set = this.db.exec(sql_query);

    if (typeof(result_set) === "undefined") {
      return;
    }

    if (result_set.length === 1) {
      let results = result_set[0]
      return results.values.map(function(row) {
        return d3.zip(results.columns, row).reduce(function(acc, z) {
          return Object.assign({}, acc, {[z[0]]: z[1]})
        }, {})
      })
    } else {
      return result_set.map(function(results) {
        return results.values.map(function(row) {
          return d3.zip(results.columns, row).reduce(function(acc, z) {
            return Object.assign({}, acc, {[z[0]]: z[1]})
          }, {})
        })
      })
    }
  }
}

class StackedArea {
  set_source(data, series, chart_region) {
    this.data = data
    this.series = series
    this.chart_region = chart_region

    // Calculate a lookup table
    this.data_lookup = this.data.map(function(d) {
      return moment(d.x_label)
    })

    // Set up axes in/out bounds
    this.data_max = d3.max(data, function(d) {
      return series.reduce(function(acc, s) {
        return acc + (d[s] || 0)
      }, 0)
    })

    let multiple;
    if (this.data_max > this.yAxisMultiple) {
      multiple = this.yAxisMultiple * 2;
    } else {
      multiple = this.yAxisMultiple;
    }

    this.yMax = (Math.ceil(this.data_max / multiple) * multiple) + multiple;
    if (this.yMax === 0) {
      this.yMax = multiple;
    }

    this.y.domain([0, this.yMax]);
  }

  set_dimensions() {
    this.margin = {top: 10, right: 40, bottom: 20, left: 20},
    this.width = (window.innerWidth * 0.95) - this.margin.left - this.margin.right;
    this.height = (window.innerHeight * 0.90) - this.margin.top - this.margin.bottom;
    this.fullHeight = this.height + this.margin.top + this.margin.bottom;

    this.x.range([0, this.width])
    this.y.range([this.height - this.margin.top - this.margin.bottom, 90])
  }

  draw() {
    let self = this
    d3.select("svg.plot.chart").selectAll("*").remove()
    this.svg = d3.select("svg.plot.chart")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("class", "svg-body")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)

    this.title = this.svg.append("text")
      .attr("class", "title")
      .attr("dx", "1mm")
      .attr("dy", "5.5mm")

    this.subtitle = this.svg.append("text")
      .attr("class", "subtitle")
      .attr("dx", "1mm")

    let last = [...this.data].pop()
    let last_date = moment(last.x_label).strftime("%b %d, %Y %H:%M")
    this.title.html(`2019-nCoV Incidence <tspan class='toggle_region' onclick='javascript:toggle_region()'>${this.chart_region}</tspan> as of ${last_date}`)
    let lastD = [...this.data].pop()
    let maxN = this.series.reduce(function(acc, s) {
      return acc + lastD[s]
      }, 0)
    this.subtitle.text(`max = ${formatNumber(maxN)}`)
    
    document.querySelector("text.title").style=`font-size: ${this.fullHeight * this.titleFactor}px`;
    document.querySelector("text.subtitle").style=`font-size: ${this.fullHeight * this.subtitleFactor}px`;

    let titleBounding = document.querySelector("text.title").getBoundingClientRect();
    d3.select("text.subtitle").attr("dy", `${titleBounding.bottom}px`);

    // Draw Y-axis
    let yAxis = d3.axisRight(this.y)
      .tickSize(-this.width)
      .tickFormat(function(d) { return `${formatNumber(d)}`; });

    this.svg.append("g")
      .attr("class", "y axis")
      .attr("transform", `translate(${this.width},0)`)
      .call(yAxis)

    // Draw X-axis
    let xAxis = d3.axisBottom(this.x)
      .tickArguments([d3.timeHour.every(24)])
      .tickFormat(function(d) {
        let date = moment(d)
        // return date.strftime("%b %d %H:%M");
        if (window.innerWidth < 500) {
          return date.strftime("%d/%m")
        } else {
          return date.strftime("%b %d")
        }
      })

    this.svg.append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${this.height - this.margin.bottom})`)
      .call(xAxis)

    // Draw area
    let stack = d3.stack()
      .keys(this.series.slice(0).reverse())
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    let stacked = stack(this.data);

    let line = d3.area()
        .x(function(d, i) {
          let date = moment(d.data.x_label).toDate()
          return self.x(date);
        })
        .y0(function(d) { return self.y(d[0]) })
        .y1(function(d) { return self.y(d[1]) })
        .curve(d3.curveCardinal.tension(0.65))

      this.svg.selectAll(".area")
        .data(stacked)
        .enter()
        .append("path")
        .attr("class", function(d) { return `area ${d.key}` })
        .attr("d", line)
        .on("mousemove", function() { self.tooltip_handler.call(this, self) })
        .on("mouseout", self.tooltip_hide)
  }

  tooltip_hide() {
    let transition = d3.transition()
      .duration(350)
      .ease(d3.easeCubic)

      chart.tooltip
        .interrupt()
        .transition(transition)
        .style("opacity", 0)

  }

  tooltip_handler(chart) {
    let bisectDate = chart.bisectDate;
    // https://bl.ocks.org/alandunning/cfb7dcd7951826b9eacd54f0647f48d3
    let actual_date = chart.x.invert(d3.mouse(this)[0])
    let i = bisectDate(chart.data, actual_date, 1)
    let datum = chart.data[i]

    // console.log(chart.series)
    chart.tooltip.selectAll("li").remove()
    chart.tooltip.select(".tooltip_series")
      .selectAll(".tooltip_series_item")
      .data(chart.series)
      .enter()
      .append("li")
      .text(function(s) {
        let count = formatNumber(datum[s])
        return `${format_series(s)}: ${count}`
      })
      .insert("div")
        .attr("class", function(s) { return `legend_item ${s}` })

    let series_total = chart.series.reduce(function(acc, s) { return acc + datum[s] }, 0)
    chart.tooltip
      .select("ul.tooltip_series")
      .append("li")
      .text(function(d) {
        return `Total: ${formatNumber(series_total)}`
      })

    chart.tooltip.select(".tooltip_updated_at").text(datum.x_label)

    let bounds = chart.tooltip.node().getBoundingClientRect();

    let pageX = d3.event.pageX;
    let pageY = d3.event.pageY;
    let xPos = pageX + 10;
    let yPos;

    if ((5 + pageY + bounds.height) > window.innerHeight) {
      yPos = window.innerHeight - 10 - bounds.height
    } else {
      yPos = 5 + pageY
    }

    chart.tooltip
      .interrupt()
      .style("visibility", "visible")
      .style("opacity", 1)
      .style("top", `${yPos}px`)
      .style("left", `${xPos}px`)

    chart.tooltip.style("visibility", "visible")
  }

  set_profile(db, profile) {
    switch (profile) {
      case "china": {
        let data = db.query(Queries.CHINA_REGIONAL)
        this.set_source(
          data,
          [
            "south_central_china",
            "east_china",
            "north_china",
            "northwest_china",
            "northeast_china",
            "southwest_china",
          ],
          "in China",
        )
        break;
      }
      case "all": {
        let data = db.query(Queries.ALL_REGIONS)
        this.set_source(data, ["confirmed", "deaths", "recovered"], "Worldwide");
        break;
      }
      default: {
        throw(`Profile '${profile}' not found`)
      }
    }
    this.profile = profile
    this.draw()
    return true
  }

  constructor() {
    this.minTime = moment("2020-01-22 00:00")
    this.maxTime = moment("2020-02-01 00:00")

    this.x = d3.scaleTime()
    this.x.domain([this.minTime.toDate(), this.maxTime.toDate()])

    this.y = d3.scaleLinear()

    this.yAxisMultiple = 200;
    
    this.titleFactor = 0.04;
    this.subtitleFactor = 0.03;

    this.bisectDate = d3.bisector(function(d) { return moment(d.x_label).toDate() }).left

    // DOM elements we may want to cache
    this.tooltip = d3.select(".chart.tooltip")

    this.set_dimensions()
  }
}

class Mapper {
  constructor(topo_data, bars, features) {
    this.topo_data = topo_data
    this.bars = bars
    this.features = features

    this.width = window.innerWidth * 0.95
    this.height = window.innerHeight - 200
    this.margin = {top: 10, right: 20, bottom: 40, left: 20},

    this.map_colors = d3.scaleCluster()

    this.map = d3.select("svg.plot.map")
        .attr("width", this.width)
        .attr("height", this.height)
        .style("left", window.innerWidth * 0.5)
        .append("g")

    this.tooltip = d3.select(".map.tooltip")

    this.projection = d3.geoMercator()
      .fitExtent([[this.margin.top, this.margin.left], [this.width - this.margin.left - this.margin.right, this.height - this.margin.top - this.margin.bottom]], topojson.mesh(this.topo_data))

    this.path = d3.geoPath().projection(this.projection)

    let x_values = Object.keys(this.bars).sort(d3.ascending).map(function(b) { return moment(b)})

    let xFirst = x_values[0].toDate()
    let xLast = [...x_values].pop().toDate()
    let xMin = x_values[0].startOf("week").toDate()
    let xMax = [...x_values].pop().endOf("month").toDate()

    this.x = d3.scaleTime()
      .domain([xMin, xMax])
      .range([0, this.width - this.margin.left - this.margin.right])
      .clamp(true)
    const x = this.x

    this.slider = this.map.append("g")
      .attr("class", "slider")
      .attr("transform", `translate(${this.margin.left}, ${this.height - 20})`);

    this.slider.append("line")
      .attr("class", "track")
      .attr("x1", x.range()[0])
      .attr("x2", x.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")

    this.slider.insert("g")
      .attr("class", "ticks")
      .selectAll(".foo")
      .data(Object.keys(this.bars).map(d => moment(d).toDate()))
      .enter()
      .append("line")
      .attr("class", "maptick")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("data-date", d => d)
      .attr("y1", -5)
      .attr("y2", 5)

    this.slider.insert("g", ".track-overlay")
      .attr("class", "xlabels")
      .attr("transform", "translate(0," + 18 + ")")
      .selectAll("text")
        .data(x.ticks(d3.timeHour.every(24)))
        .enter().append("text")
          .attr("x", x)
          .attr("text-anchor", "middle")
          .text(function(d) {
            let date = moment(d)
            // return date.strftime("%b %d %H:%M");
            if (window.innerWidth < 500) {
              return date.strftime("%d/%m")
            } else {
              return date.strftime("%b %d")
            }
          })

    this.brushStart = 0
    let brush_handler = this.brush_handler
    let self = this // gross
    const brush = d3.brushX()
      .on("end", function(a,b,c) {
        brush_handler.call(this, a, b, c, self, this.brush)
      })
      .extent(function() {
        let extents = [
          [x.range()[0], -5],
          [x.range()[1], 5]
        ]

        return extents
      })
    this.brush = brush

    let center = xLast
    this.handle = this.slider.insert("g")
      .attr("class", "brush")
      .call(brush)
      // .call(brush.move, this.brush_bounds(center).map(x))
    d3.selectAll(".brush .handle").remove()

    this.map.insert("g")
      .attr("class", "topo-group")


    window.addEventListener("keydown", event => {
      if (event.shiftKey || event.metaKey || event.altKey || event.ctrlKey) {
        return
      }

      if (event.key === "ArrowLeft") {
        return this.prev_x()
      } else if (event.key === "ArrowRight") {
        return this.next_x()
      } else if (event.key === "Home") {
        let x_value = Object.keys(this.bars)[0]
        this.set_x(x_value)
      } else if (event.key === "End") {
        let x_value = Object.keys(this.bars).pop()
        this.set_x(x_value)
      }
      this.refresh()
    });
  }

  brush_bounds(d) {
    let bound_l = moment(d).subtract(3, "hour").toDate()
    let bound_r = moment(d).add(3, "hour").toDate()
    return [bound_l, bound_r]
  }

  brush_handler(a, b, c, map) {
    if (!d3.event.sourceEvent) {
      // Programmatic event
      return
    }
    const brush = map.brush
    const selection = d3.event.selection
    const [x0, x1] = selection.map(d => map.x.invert(d))

    const center = moment(x0).add(3, "hour")
    const keys = Object.keys(map.bars)
    const bisect = d3.bisector(d => moment(d).toDate()).left

    let left = bisect(keys, center)

    if (left >= keys.length - 1) {
      left = keys.length - 1
    }

    const brush_pos = map.brush_bounds(keys[left]).map(map.x)

    if ((d3.event.selection[1] == brush_pos[1]) && (d3.event.selection[0] == brush_pos[0])) {
      return
    }

    map.set_x(keys[left])
    map.refresh()
  }

  draw_features() {
    let foo = this.map.select("g.topo-group").attr("class", "topo-group")

    for (let feature of this.features) {
      this.draw_feature(feature, foo)
    }
  }

  draw_feature(feature, node) {
    let topo = topojson.feature(this.topo_data, this.topo_data.objects[feature])

    let tooltip_handler = this.tooltip_handler
    let tooltip_hide = this.tooltip_hide
    let tooltip = this.tooltip

    node.selectAll(`path.${feature}`)
        .data(topo.features)
        .enter()
        .append("path")
          .style("stroke", "black")
          .style("stroke-width", "0.5px")
          .attr("class", `topo province ${feature}`)
          .attr("d", this.path)
          .attr("data-name", feature)
          .on("mousemove", function(datum, index, group) {
            tooltip_handler.call(this, group, tooltip)
          })
          .on("mouseout", function(datum, index, group) {
            tooltip_hide.call(this, group, tooltip)
          })
  }

  set_x(x_label) {
    let x = Object.keys(this.bars)

    let idx = x.indexOf(x_label)
    if (idx === 0) {
      d3.selectAll(".control.prev")
        .style("pointer-events", "none")
        .style("text-decoration", "none")
    } else {
      d3.selectAll(".control.prev")
        .style("pointer-events", null)
        .style("text-decoration", null)
      }

    if (idx === x.length - 1) {
      d3.selectAll(".control.next")
        .style("pointer-events", "none")
        .style("text-decoration", "none")
    } else {
      d3.selectAll(".control.next")
        .style("pointer-events", null)
        .style("text-decoration", null)
    }

    this.x_label = x_label
    this.tooltip.select(".tooltip_updated_at").text(this.x_label)
    d3.selectAll(".x-date").text(this.x_label)

    const bounds = this.brush_bounds(x_label).map(this.x)
    this.brush.move(this.handle, bounds)
  }

  prev_x() {
    let x = Object.keys(this.bars)
    let idx = x.indexOf(this.x_label)
    let prev_idx = idx - 1

    if (prev_idx < 0) {
      return
    }

    this.set_x(x[prev_idx])
    this.refresh()
  }

  next_x() {
    let x = Object.keys(this.bars)
    let idx = x.indexOf(this.x_label)
    let next_idx = idx + 1

    if (next_idx >= x.length) {
      return
    }

    this.set_x(x[next_idx])
    this.refresh()
  }

  set_field(field) {
    this.field = field

    d3.selectAll(".tooltip_category").text(field)

    d3.selectAll(`.control`)
      .classed("enabled", false)
    d3.selectAll(`.control.${field}`)
      .classed("enabled", true)

    let all_values = Object.values(this.bars).reduce(function(acc, date) {
      return acc.concat(date.map(function(d) {
        return d[field]
      }))
    }, [])

    // this.map_colors.domain([0, d3.max(all_values)])
    this.map_colors.domain(all_values)      .range([
      "level1",
      "level2",
      "level3",
      "level4",
      "level5",
      "level6",
      "level7",
      "level8",
      "level9"
    ])

    // this.map_colors.domain(bars.map(bar => bar[field]))
  }

  refresh() {
    console.log("Refresh map")

    const field = this.field
    const bars = this.bars[this.x_label]

    if (typeof(bars) === "undefined") {
      console.error("Out of bounds", this.x_label)
      return
    }

    // const quantiles = this.map_colors.quantiles()
    const quantiles = this.map_colors.clusters()
    const range = this.map_colors.range()

    let lower_bound = 0

    d3.select(".map-legend").selectAll("li").remove()
    d3.select(".map-legend").selectAll("li")
      .data(range)
      .enter()
      .append("li")
      .html(function(d, i) {
        let bounds = [lower_bound, quantiles[i]]

        lower_bound = Math.round(quantiles[i])

        let key = `<div class="legend key ${range[i]}">&nbsp</div>`
        if (bounds[1]) {
          let lower = formatNumber(Math.round(bounds[0]))
          let upper = formatNumber(Math.round(bounds[1]))
          return `${key}${lower}–${upper}`
        } else {
          let bound = formatNumber(Math.round(bounds[0]))
          return `${key}${bound}+`
        }
      })

    for (const bar of bars) {
      let province = bar.province.toLocaleLowerCase()

      d3.select(`.province.${province}`)
        .attr("data-count", bar[field])
        .attr("class", `topo province ${province} ${this.map_colors(bar[field])}`)
    }
  }

  tooltip_hide(group, tooltip) {
    let node = d3.select(this)
    const province = node.attr("data-name")

    let transition = d3.transition()
      .duration(350)
      .ease(d3.easeCubic)

    tooltip
      .interrupt()
      .transition(transition)
      .style("opacity", 0)
  }

  tooltip_handler(group, tooltip) {
    let node = d3.select(this)
    const province_name = node.attr("data-name")
    const province = CHINA_PROVINCES[province_name]

    let bounds = tooltip.node().getBoundingClientRect();

    let pageX = d3.event.pageX;
    let pageY = d3.event.pageY;
    let xPos = pageX + 10;
    let yPos;

    if ((5 + pageY + bounds.height) > window.innerHeight) {
      yPos = window.innerHeight - 10 - bounds.height
    } else {
      yPos = 5 + pageY
    }

    tooltip.selectAll(".tooltip-province").text(province.name)
    tooltip.selectAll(".tooltip-count").text(formatNumber(node.attr("data-count")))

    tooltip
      .interrupt()
      .style("top", `${yPos}px`)
      .style("left", `${xPos}px`)
      .style("opacity", 1)
      .style("visibility", "visible")
  }
}

const CHINA_PROVINCES = {
  "guangdong": {
     "name": "Guangdong (广东)",
     "population": 111690000,
  },
  "shandong": {
     "name": "Shandong (山东)",
     "population": 100060000,
  },
  "henan": {
     "name": "Henan (河南)",
     "population": 95590000,
  },
  "sichuan": {
     "name": "Sichuan (四川)",
     "population": 83020000,
  },
  "jiangsu": {
     "name": "Jiangsu (江苏)",
     "population": 80290000,
  },
  "hebei": {
     "name": "Hebei (河北)",
     "population": 75200000,
  },
  "hunan": {
     "name": "Hunan (湖南)",
     "population": 68600000,
  },
  "anhui": {
     "name": "Anhui (安徽)",
     "population": 62550000,
  },
  "hubei": {
     "name": "Hubei (湖北)",
     "population": 59020000,
  },
  "zhejiang": {
     "name": "Zhejiang (浙江)",
     "population": 56570000,
  },
  "yunnan": {
     "name": "Yunnan (云南)",
     "population": 48010000,
  },
  "jiangxi": {
     "name": "Jiangxi (江西)",
     "population": 46220000,
  },
  "liaoning": {
     "name": "Liaoning (辽宁)",
     "population": 43690000,
  },
  "fujian": {
     "name": "Fujian (福建)",
     "population": 39110000,
  },
  "shaanxi": {
     "name": "Shaanxi (陕西)",
     "population": 38350000,
  },
  "heilongjiang": {
     "name": "Heilongjiang (黑龙江)",
     "population": 37890000,
  },
  "shanxi": {
     "name": "Shanxi (山西)",
     "population": 36820000,
  },
  "guizhou": {
     "name": "Guizhou (贵州)",
     "population": 35550000,
  },
  "jilin": {
     "name": "Jilin (吉林)",
     "population": 27170000,
  },
  "gansu": {
     "name": "Gansu (甘肃)",
     "population": 26260000,
  },
  "hainan": {
     "name": "Hainan (海南)",
     "population": 9170000,
  },
  "qinghai": {
     "name": "Qinghai (青海)",
     "population": 5980000,
  },
}
