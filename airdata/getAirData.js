const fs = require("fs")
const { join } = require("path")

const parseCLIOptions = require("../shared/parseCLIOptions")
const {
  validateOptions,
  getDateString,
  getTimeString,
  pad,
  getAllTimesteps,
} = require("../shared/helpers")
const downloadFromLuftdatenInfo = require("./downloadLuftdatenInfo")
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
    description:
      "Filepath to a directory for all the measurements GeoJSON files",
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

  options.date = parseDate(options.date)

  const outputDir = options.output || "data"

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  if (fs.readdirSync(outputDir).length > 0) {
    const filesForGivenDate = fs
      .readdirSync(outputDir)
      .filter(
        file =>
          file.startsWith(`data_${getDateString(options.date)}`) &&
          file.endsWith(".geojson")
      )

    if (filesForGivenDate.length > 0) {
      console.log("Air data for given date already exists")
      return filesForGivenDate.map(file => join(outputDir, file))
    }
  }

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

    console.log(
      `Total numbers of measurements for ${timestep}:`,
      outputGeojson.features.length
    )

    const tsDate = new Date(timestep)
    const filepath = join(
      outputDir,
      `data_${getDateString(tsDate)}T${getTimeString(tsDate)}.geojson`
    )
    fs.writeFileSync(filepath, JSON.stringify(outputGeojson, null, 2))
    allOutputFiles.push(filepath)
  }

  const sources = {
    luftdatenInfo: downloadFromLuftdatenInfo,
    openSenseMap: downloadOpenSenseMap,
  }

  async function getMeasurementsPerSource(downloadOptions) {
    const measurementsPerSource = {}
    for (const [source, downloader] of Object.entries(sources)) {
      const measurements = await downloader(downloadOptions)
      measurementsPerSource[source] = measurements
      console.log()
    }

    return measurementsPerSource
  }

  const timesteps = getAllTimesteps(options.date, options.timestep)
  let measurementsPerSource = {}

  // Get data from previous day to calculate the data for 00:00:00
  const previousDate = new Date(options.date - 24 * 60 * 60 * 1000)
  console.log(
    `\nFetching data from the previous day (${getDateString(
      previousDate
    )})...\n`
  )
  const adaptedOptions = { ...options, date: previousDate }
  measurementsPerSource = await getMeasurementsPerSource(adaptedOptions)
  console.log("Done!\n")

  const firstTimestep = timesteps.shift()
  const lastTimestepData = []
  for (const [source, measurements] of Object.entries(measurementsPerSource)) {
    // The measurements are organized in timesteps so here we only take the last one
    const measurementsPerTimestep = Object.values(measurements)
    if (measurementsPerTimestep.length > 0) {
      const lastMeasurements = measurementsPerTimestep.pop()
      if (lastMeasurements.length > 0) {
        lastTimestepData.push(...lastMeasurements)
      }
    } else {
      console.log(
        `Warning: No measurements data from ${source} for timestep ${firstTimestep}`
      )
    }
  }

  if (lastTimestepData.length === 0) {
    console.log(`Warning: No measurements data for timestep ${firstTimestep}`)
  }

  writeMeasurements(lastTimestepData, firstTimestep)

  measurementsPerSource = {}

  // Get measurements from actual date
  console.log(
    `\nFetching data from specified day (${getDateString(options.date)})...\n`
  )
  measurementsPerSource = await getMeasurementsPerSource(options)
  console.log("Done!\n")

  for (const timestep of timesteps) {
    const timestepData = []
    for (const [source, measurements] of Object.entries(
      measurementsPerSource
    )) {
      const timestepMeasurements = measurements[timestep] || []
      if (timestepMeasurements.length > 0) {
        timestepData.push(...timestepMeasurements)
      } else {
        console.log(
          `Warning: No measurements data from ${source} for timestep ${timestep}`
        )
      }
    }

    if (timestepData.length === 0) {
      console.log(`Warning: No measurements data for timestep ${timestep}`)
    }

    writeMeasurements(timestepData, timestep)
  }

  return allOutputFiles
}

if (CLIOptions.run) {
  getAirData()
}

module.exports = getAirData
