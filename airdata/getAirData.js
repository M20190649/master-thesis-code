const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, getDateString, getTimeString } = require("../shared/helpers")
const {
  downloadLuftdatenInfo,
  downloadFromLuftdatenInfoArchive,
} = require("./downloadLuftdatenInfo")
const { downloadOpenSenseMap, downloadOpenSenseMapArchive } = require("./downloadOpenSenseMap")

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
    name: "from",
    type: ISOString => new Date(ISOString),
    description: "ISO Date-time string",
    required: true,
  },
  {
    name: "to",
    type: ISOString => new Date(ISOString),
    description: "ISO Date-time string",
    required: true,
  },
  {
    name: "timestep",
    type: Number,
    description: "Determines the interval of the averaged values",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath to a directory for all the measurements GeoJSON files",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function getAirData(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  if (options.from && options.to && options.from > options.to) {
    throw new Error("'from' date must be smaller than 'to' date")
  }

  if (getDateString(options.from) !== getDateString(options.to)) {
    throw new Error("'from' and 'to' date must be on the same day")
  }

  const outputDir = options.output || "data"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  } else {
    return fs
      .readdirSync(outputDir)
      .filter(file => {
        return file.endsWith(".geojson")
      })
      .map(file => {
        return `${outputDir}/${file}`
      })
  }

  const luftdatenInfoMeasurements = await downloadFromLuftdatenInfoArchive(options)
  const openSenseMapMeasurements = await downloadOpenSenseMapArchive(options)

  const allOutputFiles = []
  for (const timestep of Object.keys(luftdatenInfoMeasurements)) {
    const allMeasurements = [
      ...openSenseMapMeasurements[timestep],
      ...luftdatenInfoMeasurements[timestep],
    ]

    const geoJSONFeatures = []
    allMeasurements.forEach(m => {
      if (m.value > 250) {
        return
      }

      geoJSONFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [m.location.longitude, m.location.latitude],
        },
        properties: {
          sensorId: m.id,
          pollutant: options.pollutant,
          timestep,
          value: m.value,
        },
      })
    })

    const outputGeojson = {
      type: "FeatureCollection",
      features: geoJSONFeatures,
    }

    console.log(`Total numbers of measurements for ${timestep}: ${outputGeojson.features.length}`)

    const tsDate = new Date(timestep)
    const filepath = `${outputDir}/data_${getDateString(tsDate)}T${getTimeString(tsDate)}.geojson`
    fs.writeFileSync(filepath, JSON.stringify(outputGeojson, null, 2))
    allOutputFiles.push(filepath)
  }

  return allOutputFiles
}

if (CLIOptions.run) {
  getAirData()
}

module.exports = getAirData
