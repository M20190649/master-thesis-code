const fs = require("fs")
const axios = require("axios")
const { validateOptions } = require("../shared/helpers")
const parseCLIOptions = require("../shared/parseCLIOptions")

const optionDefinitions = [
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "CSV",
    description:
      "Bbox string (south,west,north,east) describing the boundaries which will be downloaded",
    required: true,
  },
  { name: "output", type: String, description: "Filepath for the output XML file" },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function downloadFromOverpass(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  // const query = `(way["highway"](south,west,north,east);relation["highway"](south,west,north,east);)->.all;(way["highway"~"service|elevator|footway|steps|cycleway|corridor|path|pedestrian|platform"](south,west,north,east);way["highway"~"service"](south,west,north,east);)->.exclude;(.all; - .exclude;);out body;>;out skel qt;`
  const query = `(way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|living_street|motorway_link|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|road|unclassified"](south,west,north,east);>;);out;`

  // const testBbox = [52.5056, 13.3075, 52.5182, 13.344] // south,west,north,east
  // const greaterBerlinBbox = [52.25639, 12.874603, 52.778678, 13.932037] // south,west,north,east
  // const matsimBbox = [50.819395, 11.227191, 54.321129, 15.241843]

  const outputStream = fs.createWriteStream(options.output || "./road-network.osm.xml")
  axios
    .get("http://overpass-api.de/api/interpreter", {
      responseType: "stream",
      params: {
        data: query.replace(/south,west,north,east/g, options.bbox.join(",")),
      },
    })
    .then(res => res.data.pipe(outputStream))
}

if (CLIOptions.run) {
  downloadFromOverpass()
}

module.exports = downloadFromOverpass
