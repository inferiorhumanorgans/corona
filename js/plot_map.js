class Mapper {
  constructor(topo_data, bars, features) {
    this.topo_data = topo_data
    this.bars = bars
    this.features = features

    this.width = 1500
    this.height = 500
    this.margin = {top: 10, right: 20, bottom: 40, left: 20},

    this.map_colors = d3.scaleCluster()

    this.map = d3.select("svg.plot.map")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${this.width} ${this.height}`)
        .append("g")

    this.tooltip = d3.select(".map.tooltip")

    this.projection = d3.geoMercator()
      .fitExtent([[this.margin.top, this.margin.left], [this.width - this.margin.left - this.margin.right, this.height - this.margin.top - this.margin.bottom]], topojson.mesh(this.topo_data))

    this.path = d3.geoPath().projection(this.projection)

    let x_values = Object.keys(this.bars).sort(d3.ascending).map(function(b) { return moment(b)})

    let xFirst = x_values[0].toDate()
    let xLast = [...x_values].pop().toDate()
    // let xMin = x_values[0].startOf("week").toDate()
    const xMin = moment("2020-01-21 12:00").toDate()
    let xMax = [...x_values].pop().endOf("week").toDate()

    this.x = d3.scaleTime()
      .domain([xMin, xMax])
      .range([0, this.width - this.margin.left - this.margin.right])
      .clamp(true)
    const x = this.x

    this.slider = this.map.append("g")
      .attr("class", "slider")
      .attr("transform", `translate(${this.margin.left}, ${this.height - this.margin.bottom})`);

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

    let self = this
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
            tooltip_handler(this, self, tooltip)
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

    const dateCaption = moment(this.x_label).strftime("%d %B %Y %H:%M UTC-5")
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
        field_description = "estimated case fatality rate"
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

    let field_description
    switch (field) {
      case "confirmed":
        field_description = "confirmed cases"
        break
      case "recovered":
        field_description = "recoveries"
        break
      case "death_ratio":
        field_description = "estimated case fatality rate"
        break
      default:
        field_description = field
        break
    }

    const maxN = d3.max(bars.map(function(b) {
      return b[field]
    }))

    const n = bars.reduce(function(acc, b) {
      return acc + b[field]
    }, 0)

    if (field.match(/_ratio$/)) {
      d3.selectAll(".summary").text(`${field_description}, max=${formatNumber(maxN, { style: "percent" })}`)
    } else {
      d3.selectAll(".summary").text(`${field_description}, n=${formatNumber(n)}, max=${formatNumber(maxN)}`)
    }

    // Zero out the provinces in case we have gaps in the data
    d3.selectAll(".topo.province")
      .attr("class", d=> `topo province ${d.province.toLocaleLowerCase().replace(/\s+/, '_')}`)
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

    const tooltip = d3.select('.map.tooltip')
    if (tooltip.attr("data-province")) {
      this._tooltip_refresh_data(tooltip)
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
      .on("end", function() {
        d3.select(this)
          .style("display", "none")
          .style("visibility", "hidden")
      })
      .style("opacity", 0)
  }

  _tooltip_refresh_data(tooltip) {
    const province_key = tooltip.attr("data-province")
    const province = d3.select(`.province.${province_key}`)
    const province_name = (CHINA_PROVINCES[province_key] || EURO_COUNTRIES[province_key]).name

    const data = {
      count: province.attr("data-count"),
      field: province.attr("data-field"),
    }

    tooltip.selectAll(".tooltip-province").text(province_name)
    tooltip.selectAll(".tooltip-category").style("display", null)

    if (!data.field || data.count === null) {
      tooltip.selectAll(".tooltip-count").text("No data")
      tooltip.selectAll(".tooltip-category").style("display", "none")
    } else if (data.field.match(/_ratio$/)) {
      let value = data.count
      let count

      if (value) {
        count = formatNumber(value, {style: "percent"})
      } else {
        count = "N/A"
      }

      tooltip.selectAll(".tooltip-count").text(count)
    } else {
      let count = formatNumber(data.count)
      tooltip.selectAll(".tooltip-count").text(count)
    }
  }

  tooltip_handler(event_node, chart, tooltip) {
    let node = d3.select(event_node)
    const province_name = node.attr("data-name")

    let bounds = tooltip.node().getBoundingClientRect();

    let pageX = d3.event.pageX
    let pageY = d3.event.pageY
    let xPos = pageX + 10
    let yPos

    if ((5 + pageY + bounds.height) > window.innerHeight) {
      yPos = window.innerHeight - 10 - bounds.height
    } else {
      yPos = 5 + pageY
    }

    tooltip.attr("data-province", province_name)

    chart._tooltip_refresh_data(tooltip)

    tooltip
      .interrupt()
      .style("top", `${yPos}px`)
      .style("left", `${xPos}px`)
      .style("opacity", 1)
      .style("display", null)
      .style("visibility", "visible")
  }
}
