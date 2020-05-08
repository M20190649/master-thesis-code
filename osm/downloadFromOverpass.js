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

  const roadTypes = [
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "living_street",
    "motorway_link",
    "motorway_link",
    "trunk_link",
    "primary_link",
    "secondary_link",
    "tertiary_link",
    "road",
    "unclassified",
  ]

  const query = `(way["highway"~"${roadTypes.join("|")}"](${options.bbox.join(",")});>;);out;`

  const outputStream = fs.createWriteStream(options.output || "./road-network.osm.xml")
  await axios
    .get("http://overpass-api.de/api/interpreter", {
      responseType: "stream",
      params: {
        data: query,
      },
    })
    .then(res => res.data.pipe(outputStream))

  return new Promise((resolve, reject) => {
    outputStream.on("close", resolve)
  })
}

if (CLIOptions.run) {
  downloadFromOverpass()
}

module.exports = downloadFromOverpass
