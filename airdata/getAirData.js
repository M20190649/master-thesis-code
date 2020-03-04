const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, getDateString, getTimeString } = require("../shared/helpers")
const downloadLuftdatenInfo = require("./downloadLuftdatenInfo")
const downloadOpenSenseMap = require("./downloadOpenSenseMap")

const optionDefinitions = [
  {
    name: "pollutant",
    type: String,
    description: "Name of the pollutant to fetch",
    possibleValues: ["PM10", "PM2.5"],
    required: true,
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "CSV",
    description:
      "Bbox string (south,west,north,east) describing the boundaries which will be downloaded",
    required: true,
  },
  {
    name: "datetime",
    type: ISOString => new Date(ISOString),
    description: "ISO Date-time string",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath to a directory for the measurements GeoJSON files",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function getAirData(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const outputDir = options.output || "data"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  const filepath = `${outputDir}/data_${getDateString(options.datetime)}T${getTimeString(
    options.datetime
  )}.geojson`

  if (fs.existsSync(filepath)) {
    console.log("Data already exists")
    return filepath
  }

  const openSenseMapGeoJSON = await downloadOpenSenseMap(options)
  const luftdatenInfoGeoJSON = await downloadLuftdatenInfo(options)

  console.log(`Measurements from OpenSenseMap: ${openSenseMapGeoJSON.features.length}`)
  console.log(`Measurements from Luftdaten.info: ${luftdatenInfoGeoJSON.features.length}`)

  const outputGeojson = {
    type: "FeatureCollection",
    features: [...openSenseMapGeoJSON.features, ...luftdatenInfoGeoJSON.features],
  }

  console.log(`Total numbers of measurements: ${outputGeojson.features.length}`)

  fs.writeFileSync(filepath, JSON.stringify(outputGeojson, null, 2))

  return filepath
}

if (CLIOptions.run) {
  getAirData()
}

module.exports = getAirData
