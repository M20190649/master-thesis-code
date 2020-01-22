const fs = require("fs")
const axios = require("axios")

const query = `(way["highway"](south,west,north,east);relation["highway"](south,west,north,east);)->.all;(way["highway"~"service|elevator|footway|steps|cycleway|corridor|path|pedestrian|platform"](south,west,north,east);)->.exclude;(.all; - .exclude;);out body;>;out skel qt;`

const testBbox = [52.5051, 13.3077, 52.5177, 13.3441] // south,west,north,east
const greaterBerlinBbox = [52.2984, 12.8815, 52.7001, 14.0474] // south,west,north,east

const bbox = greaterBerlinBbox

const outputStream = fs.createWriteStream("./berlin-roads.osm.xml")

axios
  .get("http://overpass-api.de/api/interpreter", {
    responseType: "stream",
    params: {
      data: query.replace(/south,west,north,east/g, bbox.join(",")),
    },
  })
  .then(res => res.data.pipe(outputStream))
