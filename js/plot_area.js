class StackedArea {
  set_source(data, series) {
    this.data = data
    this.series = series

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

    this.y.domain([0, this.data_max]);
  }

  set_dimensions() {
    this.margin = {top: 10, right: 40, bottom: 20, left: 20},
    this.fullWidth = 1200
    this.fullHeight = 480
    this.height = this.fullHeight - this.margin.top - this.margin.bottom
    this.width = this.fullWidth - this.margin.left - this.margin.right

    this.x.range([0, this.width])
    this.y.range([this.height - this.margin.top - this.margin.bottom, 90])
  }

  draw() {
    let self = this
    d3.select("svg.plot.chart").selectAll("*").remove()

    this.svg = d3.select("svg.plot.chart")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${this.fullWidth} ${this.fullHeight}`)
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
    this.title.html(`COVID-19 <tspan class='toggle category' onclick='javascript:toggle_category()'>${this.profile.category}</tspan> <tspan class='toggle region' onclick='javascript:toggle_region()'>${this.profile.adjective}</tspan> as of <tspan class="x-date">${last_date} UTC-5</tspan>`)

    // Update X
    this.maxTime = moment(last.x_label).endOf("week")
    this.x.domain([this.minTime.toDate(), this.maxTime.toDate()])

    let lastD = [...this.data].pop()
    const series = this.series
    let maxN = d3.max(this.data.map(function(d) {
      return series.reduce(function(acc, s) {
        return acc + d[s]
      }, 0)
    }, 0))

    if (maxN) {
      this.subtitle.text(`max = ${formatNumber(maxN)}`)
    } else {
      this.subtitle.text("")
    }
    
    document.querySelector("text.title").style=`font-size: ${this.fullHeight * this.titleFactor}px`;
    document.querySelector("text.subtitle").style=`font-size: ${this.fullHeight * this.subtitleFactor}px`;
    d3.select("#download").attr("data-title", `COVID-19 cases ${d3.select(".toggle.region").text()} as of ${d3.select(".x-date").text().replace(/:/g, "H")}`)

    let titleBounding = document.querySelector("text.title").getBoundingClientRect();
    d3.select("text.subtitle").attr("dy", `${titleBounding.bottom}px`);

    // Draw Y-axis
    let yAxis = d3.axisRight(this.y.nice())
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
        .curve(d3.curveMonotoneX)

      this.svg.selectAll(".area")
        .data(stacked)
        .enter()
        .append("path")
        .attr("class", function(d) { return `area ${d.key}` })
        .attr("d", line)
        .on("mousemove", function() { self.tooltip_handler.call(this, self) })
        .on("mouseout", self.tooltip_hide)

      this.render_canvas()
  }

  render_canvas() {
    const touch_up = function(root, dimensions) {
      console.log("touchup", this)
      const category_node = root.select(".toggle.category")
      switch (category_node.text()) {
        case "confirmed":
          category_node.text("confirmed cases")
          break
      }

      root.selectAll(".title")
        .attr("x", dimensions.width / 2)
        // .style("fill", "red")

      root.selectAll(".subtitle")
        .attr("dx", 0)

      if (d3.select(".toggle.region").text().match(/in China/i)) {
        this.canvas_draw_china_legend(root, dimensions)
      } else {
        this.canvas_draw_row_legend(root, dimensions)
      }
    }

    PngRender.render(
      document.querySelector("svg"),
      {
        height: 525,
        width: 1200
      },
      (root, dimensions) => touch_up.call(this, root, dimensions)
    )
  }

  canvas_draw_row_legend(parent, dimensions) {
    const base_height = dimensions.height

    if (typeof(dimensions) === "undefined") {
      console.error("SVG dimensions weren't specified for canvas_draw_row_legend")
      return
    }

    const regions = [
      [
        "north_america",
        "south_america",
        "other",
      ],
      [
        "east_asia",
        "southeast_asia",
        "central_asia",
        "south_asia",
      ],
      [
        "eastern_europe",
        "central_europe",
        "western_europe",
        "northern_europe",
        "southern_europe",
        "middle_east",
      ],
    ]

    const table = parent.append("g").style("transform", `translate(0, ${base_height - this.margin.bottom - this.margin.top - this.raster_legend_height}px)`)
    const rows = table.selectAll("g")
      .data(regions)
      .enter()
      .append("g")
      .attr("class", "region-row")
      .style("font-size", this.raster_small_font_size)
      .style("transform", (d, i) => `translate(3em, ${1.2 * i}em)`)

    rows.selectAll("g")
      .data(function(d) { return d; })
      .enter()
      .append("g")
        .attr("class", "region-cell")
        .attr("data-region", d => d)

    rows.selectAll("g.region-cell")
      .append("rect")
      .attr("width", this.raster_legend_swatch.width)
      .attr("height", this.raster_legend_swatch.height)
      .attr("class", d => `area ${d}`)
      .style("transform", (d, i) => `translate(calc(${i} * ${this.raster_legend_entry.width}`)
      .style("stroke", this.black)
      .style("stroke-width", "0.25px")

    rows.selectAll("g.region-cell")
      .append("text")
      .style("transform", (d, i) => `translate(calc((${i} * ${this.raster_legend_entry.width}) + 0.75em + ${this.raster_legend_swatch.width}), ${this.raster_legend_entry.height})`)
      .text((d, i) => d)
  }

  canvas_draw_china_legend(parent, dimensions) {
    if (typeof(dimensions) === "undefined") {
      console.error("SVG dimensions weren't specified for canvas_draw_china_legend")
      return
    }

    const base_height = dimensions.height

    const regions = [
      "south_central_china",
      "east_china",
      "north_china",
      "northwest_china",
      "northeast_china",
      "southwest_china",
    ]

    let legend = parent.append("g")
      .selectAll("g")
      .data(regions)
      .enter()
      .append("g")
      .style("transform", (d, i) => `translate(calc(${this.margin.left}px + ${i * 20.125}em), ${base_height - this.margin.bottom - this.margin.top - this.raster_legend_height}px)`)
      .style("font-size", this.raster_small_font_size)
      .style("-moz-osx-font-smoothing", "grayscale")

    legend.append("rect")
      .attr("y", "-0.75em")
      .attr("class", d => d)
      .attr("stroke", this.black)
      .attr("stroke-width", "0.5px")
      .attr("fill", "red")
      .attr("width", this.raster_legend_swatch.width)
      .attr("height", this.raster_legend_swatch.height)

    legend.append("text")
      .attr("x", "3em")
      .html(function (d) {
        const provinces = {
          east_china: [
            [
              "Anhui",
              "Fujian",
              "",
            ],
            [
              "Jiangsu",
              "Jiangxi",
              "",
            ],
            [
              "Shandong",
              "Shanghai",
              "Zhejiang",
            ]
          ],
          north_china: [
            [
              "Beijing",
              "Hebei",
              "",
            ],
            [
              "Inner Mongolia",
              "",
            ],
            [
              "Shanxi",
              "Tianjin",
            ]
          ],
          northeast_china: [
            [
              "Heilongjiang",
              "",
            ],
            [
              "Jilin",
              "Liaoning",
            ]
          ],
          northwest_china: [
            [
              "Gansu",
              "Ningxia",
              "",
            ],
            [
              "Qinghai",
              "Shaanxi",
              "",
            ],
            [
              "Xinjiang",
            ]
          ],
          south_central_china: [
            [
              "Guangdong",
              "",
            ],
            [
              "Guangxi",
              "Hainan",
              "",
            ],
            [
              "Henan",
              "Hubei",
              "Hunan",
            ],
          ],
          southwest_china: [
            [
              "Chongqing",
              "Guizhou",
              "",
            ],
            [
              "Sichuan",
              "Tibet",
              "Yunnan",
            ],
          ]
        }
        return `<tspan class="china-region">${format_series(d)}</tspan><tspan dy="1.25em" x="3em" >${
          provinces[d].map((p, i) => {
            return `<tspan x="3em" dy="1.0125em">${p.join(", ")}</tspan>`
          }).join("")
        }</tspan>`
      })
  }

  canvas_legend_china() {

  }

  tooltip_hide() {
    let transition = d3.transition()
      .duration(350)
      .ease(d3.easeCubic)

      chart.tooltip
        .interrupt()
        .transition(transition)
        .on("end", function() {
          d3.select(this)
            .style("display", "none")
            .style("visibility", "hidden")
        })
        .style("opacity", 0)
  }

  tooltip_handler(chart) {
    chart.tooltip
      .interrupt()
      .style("display", null)
      .style("visibility", "hidden")

    let bisectDate = chart.bisectDate;
    // https://bl.ocks.org/alandunning/cfb7dcd7951826b9eacd54f0647f48d3
    let actual_date = chart.x.invert(d3.mouse(this)[0])
    let i = bisectDate(chart.data, actual_date, 1)
    let datum = chart.data[i]

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

    const bounds = chart.tooltip.node().getBoundingClientRect();
    const pageX = d3.event.pageX;
    const pageY = d3.event.pageY;

    let xPos = pageX;
    let yPos;

    if ((5 + pageY + bounds.height) > window.innerHeight) {
      yPos = window.innerHeight - 10 - bounds.height
    } else {
      yPos = 5 + pageY
    }

    if ((xPos + bounds.width) >= window.innerWidth) {
      xPos -= bounds.width
    }

    chart.tooltip
      .interrupt()
      .style("display", null)
      .style("visibility", "visible")
      .style("opacity", 1)
      .style("top", `${yPos}px`)
      .style("left", `${xPos}px`)
  }

  set_profile(db, profile) {
    let adjective

    switch (profile.name) {
      case "china": {
        let data = db.query(Queries.CHINA_REGIONAL.replace(/%{category}/g, profile.category))
        this.set_source(
          data,
          [
            "south_central_china",
            "east_china",
            "north_china",
            "northwest_china",
            "northeast_china",
            "southwest_china",
          ]
        )
        adjective = "in China"
        break
      }
      case "all": {
        let data = db.query(Queries.ALL_REGIONS.replace(/%{category}/g, profile.category))
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
        ])
        adjective = "Outside China"
        break
      }
      default: {
        throw(`Profile '${JSON.stringify(profile)}' not found`)
      }
    }

    this.profile = Object.assign(profile, { adjective })
    this.draw()

    return true
  }

  constructor() {
    this.raster_legend_height = 15
    this.raster_small_font_size = "10px"
    this.raster_legend_swatch = { width: "2.5em", height: "1em" }
    this.raster_legend_entry = { width: "15em", height: "0.75em" }

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
