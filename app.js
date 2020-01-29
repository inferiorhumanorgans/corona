function formatNumber(number, options) {
  return new Intl.NumberFormat(SETTINGS.locale, options).format(number)
}

function format_series(s) {
  switch (s) {
    case "north_china":
      return "North China (华北)"
    case "northeast_china":
      return 'Northeast China (东北)'
    case "east_china":
      return 'East China (华东)'
    case "south_central_china":
      return 'South Central China (中南)'
    case "southwest_china":
      return 'Southwest China (西南)'
    case "northwest_china":
      return 'Northwest China (西北)'
    default:
      return s
  }
}

class Mapper {
  constructor(data, border_feature, other_features) {
    this.data = data
    this.border_feature = border_feature
    this.other_features = other_features

    this.map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", 800)
        .attr("height", 600)
        // .style("border", "1px solid #ccc")
        // .style("background", "white")
        .append("g")
        .attr("transform", "translate(-50, 25)")

    this.projection = d3.geoMercator()
      .fitExtent([[20, 20], [880, 580]], topojson.feature(this.data, this.data.objects[border_feature]))

    this.path = d3.geoPath().projection(this.projection)
  }

  draw_features() {
    this.draw_feature(this.border_feature)
    for (let feature of this.other_features) {
      this.draw_feature(feature)
    }
  }

  draw_feature(feature) {
    let topo = topojson.feature(this.data, this.data.objects[feature])
    this.map.selectAll("path")
        .data(topo.features)
        .enter()
        .append("path")
          .style("stroke", "black")
          .style("stroke-width", "0.5px")
          .attr("class", `topo ${feature}`)
          .attr("d", this.path)
  }
}


class Database {
  constructor(path) {
    this.db_path = path
    this.db = null
    this.sql_config = {
      locateFile: filename => `/dist/${filename}`
    }
  }

  load_data() {
    if (typeof(this.db_path) === 'undefined') {
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
        console.error('[Database:]', error);
      });
  }

  query(sql_query) {
    let result_set = this.db.exec(sql_query);

    if (typeof(result_set) === 'undefined') {
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

class StackedLine {
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
    d3.select("svg").selectAll("*").remove()
    this.svg = d3.select("svg")
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
    this.title.text(`2019-nCoV Incidence ${this.chart_region} as of ${last_date}`)
    
    document.querySelector('text.title').style=`font-size: ${this.fullHeight * this.titleFactor}px`;
    document.querySelector('text.subtitle').style=`font-size: ${this.fullHeight * this.subtitleFactor}px`;

    let titleBounding = document.querySelector('text.title').getBoundingClientRect();
    d3.select('text.subtitle').attr('dy', `${titleBounding.bottom}px`);

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
    console.log('stack eries', this.series)
    let stack = d3.stack()
      .keys(this.series.slice(0).reverse())
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    let stacked = stack(this.data);
    console.log('stacked', stacked)
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
    chart.tooltip
      .interrupt()
      .style("visibility", "visible")
      .style("opacity", 1)
      .style("top", `${d3.event.pageY + 5}px`)
      .style("left", `${d3.event.pageX + 10}px`)

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
    chart.tooltip.style("visibility", "visible")
  }

  set_profile(db, profile) {
    switch (profile) {
      case 'china': {
        let data = db.query(Queries.CHINA_REGIONAL)
        this.set_source(
          data,
          [
            'south_central_china',
            'east_china',
            'north_china',
            'northwest_china',
            'northeast_china',
            'southwest_china',
          ],
          "in China",
        )
        break;
      }
      case 'all': {
        let data = db.query(Queries.ALL_REGIONS)
        this.set_source(data, ['confirmed', 'deaths', 'recovered'], "Worldwide");
        break;
      }
      default: {
        throw(`Profile '${profile}' not found`)
      }
    }
    this.draw()
    return true
  }

constructor() {
    this.minTime = moment('2020-01-22 00:00')
    this.maxTime = moment('2020-02-01 00:00')

    this.x = d3.scaleTime()
    this.x.domain([this.minTime.toDate(), this.maxTime.toDate()])

    this.y = d3.scaleLinear()

    this.yAxisMultiple = 200;
    
    this.titleFactor = 0.04;
    this.subtitleFactor = 0.03;

    this.bisectDate = d3.bisector(function(d) { return moment(d.x_label).toDate() }).left

    // DOM elements we may want to cache
    this.tooltip = d3.select('.tooltip')

    this.set_dimensions()
  }
}
