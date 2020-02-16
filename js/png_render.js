class PngRender {
  static attach(selector) {
    d3.select(selector).node().addEventListener("click", PngRender.download_png, false)
  }

  static canvas() {
    return document.querySelector(".png-canvas")
  }

  static render(svg, dimensions, touch_up) {

    let xml = new XMLSerializer().serializeToString(svg)
    const svg_width = dimensions.width * window.devicePixelRatio
    const svg_height = dimensions.height * window.devicePixelRatio

    // Fix up SVG for rendering to canvas
    {
      let img = document.querySelector(".png-img")
      img.innerHTML = xml

      const temp_svg = d3.select(img).select("svg")
        .attr("height", svg_height)
        .attr("width", svg_width)
        .style("text-rendering", "optimizeLegibility")

      PngRender.insert_inline_css(temp_svg)

      if (typeof(touch_up) !== "undefined") {
        touch_up(temp_svg, dimensions)
      }

      xml = new XMLSerializer().serializeToString(document.querySelector(".png-img svg"))
      img.innerHTML = ""
    }

    let img = document.querySelector(".png-img")
    let canvas = PngRender.canvas()
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
    const DOMURL = self.URL || self.webkitURL || self;
    const blob_url = DOMURL.createObjectURL(blob);

    d3.select(canvas)
      .attr("height", svg_height)
      .attr("width", svg_width)

    img.onload = () => PngRender.draw_svg.call(this, canvas, img, blob_url)
    img.src = blob_url
  }

  static draw_svg(canvas, img, blob_url) {
    const DOMURL = self.URL || self.webkitURL || self;
    let ctx = canvas.getContext("2d")
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = "#ededed"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    DOMURL.revokeObjectURL(blob_url)
  }

  static insert_inline_css(parent) {
    parent.insert("style", ":first-child")
      .attr("type", "text/css")
      .node().innerHTML =`<![CDATA[
        .svg-body {
          fill: #ededed;
        }
        .title {
          font: 400 52px "Avenir Next Condensed", "Palanquin", "Helvetica Neue", "Helvetica", "sans-serif";
          fill: ${PngRender.black};
          text-anchor: middle;
        }
        .china-region {
          font-weight: bold;
        }
        text,
        .y.axis text,
        .x.axis text {
          font-family: "Bell Gothic Std Light", "DejaVu Mono", "monospace";
          fill: ${PngRender.black};
        }
        .legend text {
          font-family: "Bell Gothic Std Light", "DejaVu Mono", Menlo, "Courier New", Courier, monospace;
          font-size: 10px;
          fill: white;
        }        
        .area {
          fill-opacity: ${PngRender.raster_area_opacity};
        }
        .east_china {
          background: #d8b365;
          fill: #d8b365;
        }
        
        .north_china {
          background: #f6e8c3;
          fill: #f6e8c3;
        }
        
        .northeast_china {
          background: #5ab4ac;
          fill: #5ab4ac;
        }
        
        .northwest_china {
          background: #c7eae5;
          fill: #c7eae5;
        }
        
        .south_central_china {
          background: #8c510a;
          fill: #8c510a;
        }
        
        .southwest_china {
          background: #01665e;
          fill: #01665e;
        }

        .east_asia {
          fill: #543005;
          background: #543005;
        }
        
        .southeast_asia {
          fill: #8c510a;
          background: #8c510a;
        }
        
        .central_asia {
          fill: #bf812d;
          background: #bf812d;
        }
        
        .south_asia {
          fill: #dfc27d;
          background: #dfc27d;
        }
        
        .eastern_europe {
          fill: #f6e8c3;
          background: #f6e8c3;
        }
        
        .central_europe {
          fill: whitesmoke;
          background: whitesmoke;
        }
        
        .western_europe {
          fill: #c7eae5;
          background: #c7eae5;
        }
        
        .northern_europe {
          fill: #80cdc1;
          background: #80cdc1;
        }
        
        .southern_europe {
          fill: #35978f;
          background: #35978f;
        }
        
        .middle_east {
          fill: #74add1;
          background: #74add1;
        }
        
        .north_america {
          fill: #4575b4;
          background: #4575b4;
        }
        
        .south_america {
          fill: #313695;
          background: #313695;
        }
        
        .other {
          fill: #00362b;
          background: #00362b;
        }
        
      ]]>`
  }

  static download_png() {
    const filename = `${d3.select(this).attr("data-title")}.png`
    const canvas = PngRender.canvas()
    const dt = canvas.toDataURL("image/png")

    // this.download = filename
    this.href = dt
  }
}

PngRender.raster_area_opacity = 0.95
// static black = "black"
PngRender.black = "#1b191d"
