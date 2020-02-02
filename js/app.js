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
