const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, getDateString, getTimeString, pad } = require("../shared/helpers")
const { downloadFromLuftdatenInfoArchive } = require("./downloadLuftdatenInfo")
const { downloadOpenSenseMapArchive } = require("./downloadOpenSenseMap")

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
    name: "date",
    type: String,
    typeLabel: "dd.mm.yyyy",
    description: "Date string",
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
const parseDate = dateString => {
  const [day, month, year] = dateString.split(".").map(Number)
  return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00.000Z`)
}

const CLIOptions = parseCLIOptions(optionDefinitions)

async function getAirData(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const outputDir = options.output || "data"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  if (fs.readdirSync(outputDir).length > 0) {
    console.log("Air data already exists")
    return fs
      .readdirSync(outputDir)
      .filter(file => {
        return file.startsWith("data") && file.endsWith(".geojson")
      })
      .map(file => {
        return `${outputDir}/${file}`
      })
  }

  options.date = parseDate(options.date)
  const [south, west, north, east] = options.bbox
  const allOutputFiles = []

  function writeMeasurements(measurements, timestep) {
    const geoJSONFeatures = []
    measurements.forEach(m => {
      // Another extra boundary check
      if (
        m.location.latitude < south ||
        m.location.latitude > north ||
        m.location.longitude < west ||
        m.location.longitude > east
      ) {
        return
      }

      geoJSONFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [m.location.longitude, m.location.latitude],
        },
        properties: {
          ...m.properties,
          timestep,
          pollutant: options.pollutant,
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

  let luftdatenInfoMeasurements = null
  let openSenseMapMeasurements = null

  // Get data from previous day to calculate the data for 00:00:00
  console.log("\nFetching data from the previous day...\n")
  const adaptedOptions = { ...options, date: new Date(options.date - 1000 * 60 * 60 * 24) }
  luftdatenInfoMeasurements = await downloadFromLuftdatenInfoArchive(adaptedOptions)
  console.log("\n")
  openSenseMapMeasurements = await downloadOpenSenseMapArchive(adaptedOptions)
  console.log("\nDone!\n")

  const lastTimestepData = [
    ...(Object.values(luftdatenInfoMeasurements).pop() || []),
    ...(Object.values(openSenseMapMeasurements).pop() || []),
  ]

  writeMeasurements(lastTimestepData, options.date.toISOString())

  // Get measurements from actual date
  console.log("Fetching data from specified day...\n")
  luftdatenInfoMeasurements = await downloadFromLuftdatenInfoArchive(options)
  console.log("\n")
  openSenseMapMeasurements = await downloadOpenSenseMapArchive(options)
  console.log("\nDone!\n")

  for (const timestep of Object.keys(luftdatenInfoMeasurements)) {
    writeMeasurements(
      [
        ...(openSenseMapMeasurements[timestep] || []),
        ...(luftdatenInfoMeasurements[timestep] || []),
      ],
      timestep
    )
  }

  return allOutputFiles
}

if (CLIOptions.run) {
  getAirData()
}

module.exports = getAirData
