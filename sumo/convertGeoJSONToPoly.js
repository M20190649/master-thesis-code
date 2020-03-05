const fs = require("fs")
const XMLBuilder = require("xmlbuilder")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash, validateOptions } = require("../shared/helpers")

const optionDefinitions = [
  { name: "geojson", type: String, description: "Filepath to GeoJSON file", required: true },
  { name: "network", type: String, description: "Filepath to SUMO network file", required: true },
  {
    name: "output",
    type: String,
    description: "Filepath to output polygon XML file",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function convertGeoJSONToPoly(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  fs.mkdirSync("tmp")

  const file = fs.readFileSync(options.geojson, "utf8")
  const geojson = JSON.parse(file)
  const { coordinates } = geojson.features[0].geometry

  // Since SUMO can't handle polygons with holes we can only take the first polygon in the coordinates array
  const coordinatesString = coordinates[0].map(([long, lat]) => `${long},${lat}`).join(" ")
  const xml = XMLBuilder.begin()
    .element("poly", {
      id: 0,
      shape: coordinatesString,
    })
    .end({ pretty: true })

  fs.writeFileSync("tmp/polygon.xml", xml)

  await runBash(
    `polyconvert --xml-files tmp/polygon.xml --net-file ${options.network} --output-file ${options.output}`
  )

  fs.unlinkSync("tmp/polygon.xml")
  fs.rmdirSync("tmp")
}

if (CLIOptions.run) {
  convertGeoJSONToPoly()
}

module.exports = convertGeoJSONToPoly
