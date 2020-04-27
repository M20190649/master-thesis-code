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

  function convertPolygon(properties, coordinates) {
    const { zone } = properties

    if (zonePolygonCounter[zone] !== undefined) {
      zonePolygonCounter[zone]++
    } else {
      zonePolygonCounter[zone] = 0
    }

    const polyId = `${pad(zone)}-${pad(zonePolygonCounter[zone])}`
    const getShape = polygon => polygon.map(([long, lat]) => `${long},${lat}`).join(" ")

    // Since SUMO can't handle polygons with holes we split into the main polygon and the holes
    // We clearly mark the holes with a 'hole-{hole-counter}' prefix
    const [mainPolygon, ...holes] = coordinates
    // Add the main polygon
    xml.element("poly", {
      id: polyId,
      shape: getShape(mainPolygon),
      color: `${zoneColours[zone - 1]},0.8`,
      layer: zone,
    })

    // Add all the holes
    for (const [i, hole] of holes.entries()) {
      xml.element("poly", {
        id: `hole-${pad(i)}-${polyId}`,
        shape: getShape(hole),
        color: `${zoneColours[zone - 1]},0`,
        layer: zone,
      })
    }
  }

  geojson.features.forEach(f => {
    const { type, coordinates } = f.geometry

    switch (type) {
      case "Polygon":
        convertPolygon(f.properties, coordinates)
        break
      case "MultiPolygon":
        for (const polygonCoordinates of coordinates) {
          convertPolygon(f.properties, polygonCoordinates)
        }
        break
      default:
        break
    }
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
