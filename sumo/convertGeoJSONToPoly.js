const fs = require("fs")
const XMLBuilder = require("xmlbuilder")
const { default: booleanDisjoint } = require("@turf/boolean-disjoint")
const turf = require("@turf/helpers")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash, validateOptions, pad } = require("../shared/helpers")

const optionDefinitions = [
  {
    name: "geojson",
    type: String,
    description: "Filepath to GeoJSON file",
    required: true,
  },
  {
    name: "network",
    type: String,
    description: "Filepath to SUMO network file",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath to output polygon XML file",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

const zoneColour = "128,0,255"
const alphaMin = 50
const alphaMax = 255

async function convertGeoJSONToPoly(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const file = fs.readFileSync(options.geojson, "utf8")
  const geojson = JSON.parse(file)

  const nZones = Math.max(...geojson.features.map(f => f.properties.zone))
  const alphaStep = Math.floor((alphaMax - alphaMin) / (nZones - 1 || 1))

  const xml = XMLBuilder.create("additional")
  const zonePolygonCounter = {}

  function convertPolygon(properties, coordinates) {
    const { zone } = properties

    if (zonePolygonCounter[zone] !== undefined) {
      zonePolygonCounter[zone] += 1
    } else {
      zonePolygonCounter[zone] = 0
    }

    const polyId = `${pad(zone)}-${pad(zonePolygonCounter[zone])}`
    const getShape = polygon =>
      polygon.map(([long, lat]) => `${long},${lat}`).join(" ")
    const layer = -nZones + zone

    // Since SUMO can't handle polygons with holes we split into the main polygon and the holes
    // We clearly mark the holes with a 'hole-{hole-counter}' prefix
    const [mainPolygon, ...holes] = coordinates
    // Add the main polygon
    xml.element("poly", {
      id: polyId,
      color: `${zoneColour},${alphaMin + (zone - 1) * alphaStep}`,
      layer: `${layer}.0`,
      type: "zone",
      shape: getShape(mainPolygon),
    })

    for (const [i, hole] of holes.entries()) {
      // Most holes are just other nested zones (type: filled-hole)
      const holeElement = {
        id: `hole-${pad(i)}-${polyId}`,
        color: `${zoneColour},0`,
        layer: `${layer}.0`,
        type: "filled-hole",
        shape: getShape(hole),
      }

      // In zone 1 there can be real holes which belong to zone 0 (type: empty-hole)
      // Find real holes and make them differentiable
      if (zone === 1) {
        const holePolygon = turf.polygon([hole])
        const isRealHole = geojson.features
          .filter(f => f.properties.zone === 2)
          .every(f => booleanDisjoint(f, holePolygon))

        if (isRealHole) {
          holeElement.color = `255,255,255,254`
          holeElement.layer = `1.0`
          holeElement.type = "empty-hole"
        }
      }

      xml.element("poly", holeElement)
    }
  }

  for (const feature of geojson.features) {
    const { properties, geometry } = feature
    const { type, coordinates } = geometry

    switch (type) {
      case "Polygon":
        convertPolygon(properties, coordinates)
        break
      case "MultiPolygon":
        for (const polygonCoordinates of coordinates) {
          convertPolygon(properties, polygonCoordinates)
        }
        break
      default:
        break
    }
  }

  const tempDir = fs.mkdtempSync("tmp-")
  fs.writeFileSync(`${tempDir}/polygon.xml`, xml.end({ pretty: true }))

  await runBash([
    "polyconvert",
    `--xml-files ${tempDir}/polygon.xml`,
    `--net-file ${options.network}`,
    `--output-file ${options.output}`,
  ])

  fs.unlinkSync(`${tempDir}/polygon.xml`)
  fs.rmdirSync(tempDir)
}

if (CLIOptions.run) {
  convertGeoJSONToPoly()
}

module.exports = convertGeoJSONToPoly
