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

    // chart.tooltip
    // .interrupt()
    // .style("left", 0)

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
        this.set_source(data, [
          // "china",
          "east_asia",
          "southeast_asia",
          "central_asia",
          "south_asia",
          "eastern_europe",
          "central_europe",
          "western_europe",
          "northern_europe",
          "southern_europe",
          "middle_east",
          "north_america",
          "south_america",
          "other"
        ], "Outside China");
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
    let xMax = [...x_values].pop().endOf("week").toDate()

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

    // Add the province key to our TopoJSON features so we can
    // muck with them later without touching the spatial data
    topo.features = topo.features.map(function(f) {
      f.province = feature
      return f
    })

    let tooltip_handler = this.tooltip_handler
    let tooltip_hide = this.tooltip_hide
    let tooltip = this.tooltip

    node.selectAll(`path.${feature}`)
        .data(topo.features, d => d.province)
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

    const dateCaption = moment(this.x_label).strftime("%d %B %Y %H:%M")
    d3.selectAll(".x-date").text(dateCaption)

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

    let field_description;
    switch (field) {
      case "death_ratio":
        field_description = "estimated case fatality ratio"
        break;
      default:
        field_description = field
        break
    }
    d3.selectAll(".tooltip-category").text(field_description)

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
    this.map_colors.domain(all_values).range([
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
    // console.log("Refresh map", this.x_label)

    const field = this.field
    const bars = this.bars[this.x_label]

    if (typeof(bars) === "undefined") {
      console.error("Out of bounds", this.x_label)
      return
    }

    // const quantiles = this.map_colors.quantiles()
    const quantiles = this.map_colors.clusters()
    const range = this.map_colors.range()
    const domain = this.map_colors.domain()
    const min = d3.min(domain)

    let lower_bound = min

    function create_legend(upper_bound, idx) {
      let key = `<div class="legend key ${range[idx]}">&nbsp</div>`

      let range_string
      let lower_number, upper_number

      if (field.match(/_ratio$/)) {
        lower_number = formatNumber(lower_bound, { style: "percent" })
        upper_number = formatNumber(upper_bound - 0.01, { style: "percent" })
      } else {
        lower_number = formatNumber(lower_bound)
        upper_number = formatNumber(upper_bound - 1)
      }

      if (lower_number === upper_number) {
        range_string = lower_number
      } else {
        range_string = `${lower_number}–${upper_number}`
      }

      lower_bound = upper_bound
      return `${key}${range_string}`
    }

    d3.select(".map.legend").selectAll("li").remove()
    d3.select(".map.legend").selectAll("li")
      .data(quantiles)
      .enter()
      .append("li")
      .html(create_legend)

    d3.select(".map.legend")
      .append("li")
      .html(function() {
        const last_quantile = domain.filter(d => d >= lower_bound)
        const factor = (field.match(/_ratio$/)) ? 0.01 : 1
        return create_legend(d3.max(last_quantile) + factor, quantiles.length)
      })

    const map_colors = this.map_colors

    // Zero out the provinces in case we have gaps in the data
    d3.selectAll('.topo.province')
      .attr("class", "topo province")
      .attr("data-count", null)
      .attr("data-field", null)

    d3.selectAll('.province')
      .data(bars, d => d.province.toLocaleLowerCase().replace(/\s+/, '_'))
      .attr("data-field", () => field)
      .attr("data-count", d => d[field])
      .attr("class", d => {
        const province_key = d.province.toLocaleLowerCase().replace(/\s+/, '_')
        const quantile = d[field] === null ? "" : map_colors(d[field])

        return `topo province ${province_key} ${quantile}`
      })
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
    const province = CHINA_PROVINCES[province_name] || EURO_COUNTRIES[province_name]

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
    tooltip.selectAll(".tooltip-category").style("display", null)

    if (!node.attr("data-field") || node.attr("data-count") === null) {
      tooltip.selectAll(".tooltip-count").text("No data")
      tooltip.selectAll(".tooltip-category").style("display", "none")
    } else if (node.attr("data-field").match(/_ratio$/)) {
      let value = node.attr("data-count")
      let count

      if (value) {
        count = formatNumber(value, {style: "percent"})
      } else {
        count = "N/A"
      }

      tooltip.selectAll(".tooltip-count").text(count)
    } else {
      let count = formatNumber(node.attr("data-count"))
      tooltip.selectAll(".tooltip-count").text(count)
    }

    tooltip
      .interrupt()
      .style("top", `${yPos}px`)
      .style("left", `${xPos}px`)
      .style("opacity", 1)
      .style("visibility", "visible")
  }
}

const CHINA_PROVINCES = {
  "beijing": {
    "name": "Beijing (北京)",
  },
  "chongqing": {
    "name": "Chongqing (重庆)",
  },
  "shanghai": {
    "name": "Shanghai (上海)",
  },
  "tianjin": {
    "name": "Tianjin (天津)",
  },
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

const EURO_COUNTRIES = {
  "albania": {
    "name": "Albania",
    "population": 0,
  },
  "andorra": {
    "name": "Andorra",
    "population": 0,
  },
  "armenia": {
    "name": "Armenia",
    "population": 0,
  },
  "austria": {
    "name": "Austria",
    "population": 0,
  },
  "azerbaijan": {
    "name": "Azerbaijan",
    "population": 0,
  },

  "belarus": {
    "name": "Belarus",
    "population": 0,
  },
  "belgium": {
    "name": "Belgium",
    "population": 0,
  },
  "bosnia_and_herzegovina": {
    "name": "Bosnia and Herzegovina",
    "population": 0,
  },
  "bulgaria": {
    "name": "Bulgaria",
    "population": 0,
  },

  "croatia": {
    "name": "Croatia",
    "population": 0,
  },
  "cyprus": {
    "name": "Cyprus",
    "population": 0,
  },
  "czechia": {
    "name": "Czechia",
    "population": 0,
  },

  "denmark": {
    "name": "Denmark",
    "population": 0,
  },

  "estonia": {
    "name": "Estonia",
    "population": 0,
  },

  "finland": {
    "name": "Finland",
    "population": 0,
  },
  "france": {
    "name": "France",
    "population": 0,
  },

  "georgia": {
    "name": "Georgia",
    "population": 0,
  },
  "germany": {
    "name": "Germany",
    "population": 0,
  },
  "greece": {
    "name": "Greece",
    "population": 0,
  },

  "hungary": {
    "name": "Hungary",
    "population": 0,
  },

  "iceland": {
    "name": "Iceland",
    "population": 0,
  },
  "ireland": {
    "name": "Ireland",
    "population": 0,
  },
  "italy": {
    "name": "Italy",
    "population": 0,
  },

  "kazakhstan": {
    "name": "Kazakhstan",
    "population": 0,
  },
  "kosovo": {
    "name": "Kosovo",
    "population": 0,
  },

  "latvia": {
    "name": "Latvia",
    "population": 0,
  },
  "liechtenstein": {
    "name": "Liechtenstein",
    "population": 0,
  },
  "lithuania": {
    "name": "Lithuania",
    "population": 0,
  },
  "luxembourg": {
    "name": "Luxembourg",
    "population": 0,
  },

  "malta": {
    "name": "Malta",
    "population": 0,
  },
  "moldova": {
    "name": "Moldova",
    "population": 0,
  },
  "monaco": {
    "name": "Monaco",
    "population": 0,
  },
  "montenegro": {
    "name": "Montenegro",
    "population": 0,
  },

  "netherlands": {
    "name": "Netherlands",
    "population": 0,
  },
  "macedonia": {
    "name": "Macedonia",
    "population": 0,
  },
  "norway": {
    "name": "Norway",
    "population": 0,
  },

  "poland": {
    "name": "Poland",
    "population": 0,
  },
  "portugal": {
    "name": "Portugal",
    "population": 0,
  },

  "romania": {
    "name": "Romania",
    "population": 0,
  },
  "russia": {
    "name": "Russia",
    "population": 0,
  },

  "san_marino": {
    "name": "San Marino",
    "population": 0,
  },
  "serbia": {
    "name": "Serbia",
    "population": 0,
  },
  "slovakia": {
    "name": "Slovakia",
    "population": 0,
  },
  "slovenia": {
    "name": "Slovenia",
    "population": 0,
  },
  "spain": {
    "name": "Spain",
    "population": 0,
  },
  "sweden": {
    "name": "Sweden",
    "population": 0,
  },
  "switzerland": {
    "name": "Switzerland",
    "population": 0,
  },

  "turkey": {
    "name": "Turkey",
    "population": 0,
  },

  "ukraine": {
    "name": "Ukraine",
    "population": 0,
  },
  "united_kingdom": {
    "name": "United Kingdom",
    "population": 0,
  },

  "vatican_city": {
    "name": "Vatican City",
    "population": 0,
  },
}

window.addEventListener("keydown", event => {
  if (event.metaKey || event.altKey || event.ctrlKey) {
    return
  }

  if (event.key == "?") {
    d3.select(".about").style("display", "block")
    return
  } else if (event.key == "Escape") {
    d3.select(".about").style("display", null)
    return
  }

})

document.addEventListener('DOMContentLoaded', (event) => {
  d3.select(".about").html(`
    <a href="javascript:void(0)" onclick="javascript:{d3.select('.about').style('display', null)}">[x]</a>
    <p>
      <span style="font-weight: bold">About this map:</span><br>
      First and foremost this is a casual attempt at using <a href="https://d3js.org/" target="_blank">D3.js</a> and learning more about it.
      These visulizations are intended for entertainment purposes only.  I've attempted to make this as accurate and straightforward as possible, but they're not perfect.
      For instance, the case fatality rate (CFR) is impossible to know precisely (especially towards the beginning of a rapidly evolving pandemic).  <a href="https://pdfs.semanticscholar.org/ebf2/48c9fc0a1a23d1778b94083319aa995e34f4.pdf" target="_blank">Ghani, et al.</a> discussed
      a variety of methods for estimating the CFR and I've picked a simple one that only utilizes known outcomes: <span style="font-family: 'DejaVu Mono'">deaths / (deaths + recoveries)</span>.
      If there are glaring issues feel free to open an issue on GitHub.
    </p>
    <p>
      The data used comes from a variety of places.  Epidemiological comes courtesy of Johns Hopkins University's <a href="https://systems.jhu.edu/" target="_blank">Center for Systems Science and Engineering</a>.
      <a href="https://gadm.org/data.html">GADM</a> spatial data was used to create the maps.  Wikipedia was also used for a variety of information including: <a href="https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes" target="_blank">ISO 3166 country codes</a>, population estimates for China, and <a href="https://en.wikipedia.org/wiki/Provinces_of_China#Greater_administrative_areas" target="_blank">political boundaries within China</a>.  The open source font families <a href="https://dejavu-fonts.github.io/" target="_blank">DejaVu</a> and <a href="https://github.com/VanillaandCream/Palanquin/" target="_blank">Palanquin</a> allow for a consistent look across different platforms.
    </p>
    <p>
      While the intent is to be mostly standards compliant, this site was not made with mobile devices in mind.  It's almost usable, but not quite.  It is tested in <a href="https://www.mozilla.org/firefox" target="_blank">Firefox</a>, but should work with other modern browsers.  If an on-screen item is underlined, click on it and something magical should happen.  A handful of keyboard shortcuts are also available.  The left and right arrows move the selected point in time back and forward respectively.  Hitting escape will close this lightbox.
    </p>
    <p>
      Is this too morbid?  Click <a href="https://www.thefarside.com/" target="_blank">here</a> for cuddly cats and cute farm animals.
    </p>
  `)
});
