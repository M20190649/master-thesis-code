const fs = require("fs")
const XMLBuilder = require("xmlbuilder")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash, validateOptions, pad } = require("../shared/helpers")

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

const zoneColours = [
  "0.267004,0.004874,0.329415",
  "0.190631,0.407061,0.556089",
  "0.20803,0.718701,0.472873",
  "0.993248,0.906157,0.143936",
]

async function convertGeoJSONToPoly(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  if (fs.existsSync("tmp")) {
    fs.rmdirSync("tmp")
  }

  fs.mkdirSync("tmp")

  const file = fs.readFileSync(options.geojson, "utf8")
  const geojson = JSON.parse(file)

  const xml = XMLBuilder.create("additional")
  const zonePolygonCounter = {}
  geojson.features.forEach(f => {
    const { coordinates } = f.geometry
    const { zone } = f.properties

    if (zonePolygonCounter[zone] !== undefined) {
      zonePolygonCounter[zone]++
    } else {
      zonePolygonCounter[zone] = 0
    }

    // Since SUMO can't handle polygons with holes we can only take the first polygon in the coordinates array
    const coordinatesString = coordinates[0].map(([long, lat]) => `${long},${lat}`).join(" ")
    xml.element("poly", {
      id: `${pad(zone)}_${pad(zonePolygonCounter[zone])}`,
      shape: coordinatesString,
      color: `${zoneColours[zone - 1]},0.8`,
      layer: zone,
    })
  })

  fs.writeFileSync("tmp/polygon.xml", xml.end({ pretty: true }))

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
