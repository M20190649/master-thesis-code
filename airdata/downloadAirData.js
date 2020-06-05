const fs = require("fs")
const { join } = require("path")

const parseCLIOptions = require("../shared/parseCLIOptions")
const {
  validateOptions,
  getDateString,
  getTimeString,
  pad,
} = require("../shared/helpers")
const { SensorMeasurement } = require("./Models")
const luftdatenInfo = require("./luftdatenInfo")
const openSenseMap = require("./openSenseMap")
const umweltBundesamt = require("./umweltBundesamt")

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
    maxValue: 24 * 60,
    minValue: 1,
  },
  {
    name: "avg-interval",
    type: Number,
    description:
      "Determines the range of values that are considered for the average",
    required: false,
    maxValue: 24 * 60,
    minValue: 1,
  },
  {
    name: "avg-method",
    type: String,
    description:
      "Determines what type of average should be used for the values within the avg-interval",
    required: false,
    defaultValue: "weighted",
    possibleValues: ["simple", "weighted"],
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

async function downloadAirData(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  if (!options["avg-interval"]) {
    // Default avg-interval to the timestep value
    options["avg-interval"] = options.timestep
  }

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
      // console.log("Air data for given date already exists")
      // return filesForGivenDate.map(file => join(outputDir, file))
    }
  }

  const [south, west, north, east] = options.bbox

  // Calculate list of all timesteps
  const allTimesteps = []
  const stop = new Date(options.date.getTime() + 24 * 60 * 60 * 1000)
  let currentTimestep = options.date
  while (currentTimestep < stop) {
    allTimesteps.push(currentTimestep)
    currentTimestep = new Date(
      currentTimestep.getTime() + options.timestep * 60 * 1000
    )
  }

  // Prepare object with empty lists for every timestep
  const timestepMeasurements = {}
  allTimesteps.forEach(ts => {
    timestepMeasurements[ts.toISOString()] = []
  })

  const sources = {
    luftdatenInfo,
    openSenseMap,
  }

  if (options.timestep === 60 && options["avg-interval"] === 60) {
    sources.uba = umweltBundesamt
  }

  for (const source of Object.values(sources)) {
    const { download, getMeasurements } = source
    // Get data from previous day to calculate the data for 00:00:00
    const previousDate = new Date(options.date - 24 * 60 * 60 * 1000)
    console.log(
      `Fetching data from the previous day (${getDateString(
        previousDate
      )})...\n`
    )
    const adaptedOptions = { ...options, date: previousDate }
    const prevDaySensors = await download(adaptedOptions)

    console.log(
      `\nFetching data from specified day (${getDateString(options.date)})...\n`
    )
    const simDaySensors = await download(options)
    console.log()

    const prevDaySensorIds = prevDaySensors.map(s => s.id)
    const simDaySensorIds = simDaySensors.map(s => s.id)
    const overlappingSensorIds = simDaySensorIds.filter(id =>
      prevDaySensorIds.includes(id)
    )
    const allSensorsIds = new Set([...prevDaySensorIds, ...simDaySensorIds])

    console.log(`Sensors for previous day: ${prevDaySensors.length}`)
    console.log(`Sensors for simulation day: ${simDaySensors.length}`)
    console.log(`Overlapping sensors: ${overlappingSensorIds.length}`)
    console.log(`Total sensors: ${allSensorsIds.size}`)
    console.log()

    for (const sensorId of allSensorsIds) {
      let sensor = null
      const measurements = []

      const prevDaySensor = prevDaySensors.find(s => s.id === sensorId)
      if (prevDaySensor) {
        const prevDayMeasurements = getMeasurements(
          prevDaySensor.dataFilePath,
          options
        )
        measurements.push(...prevDayMeasurements)
        sensor = prevDaySensor
      }

      const simDaySensor = simDaySensors.find(s => s.id === sensorId)
      if (simDaySensor) {
        const simDayMeasurements = getMeasurements(
          simDaySensor.dataFilePath,
          options
        )
        measurements.push(...simDayMeasurements)
        sensor = simDaySensor
      }

      // Aggregate measurements for every timestep
      const avgMethod = options["avg-method"]

      for (const timestep of allTimesteps) {
        const avgIntervalStart = new Date(
          timestep.getTime() - options["avg-interval"] * 60 * 1000
        )
        const relevantMeasurements = measurements.filter(
          m => m.timestamp > avgIntervalStart && m.timestamp <= timestep
        )

        if (relevantMeasurements.length === 0) {
          continue
        }

        if (source === "uba" && relevantMeasurements.length !== 1) {
          // UBA only provides hourly averaged values so there should only be one
          throw new Error("UBA Measurement is not unique")
        }

        let avgValue = -1

        if (avgMethod === "simple") {
          const sum = relevantMeasurements.reduce((sum, m) => sum + m.value, 0)
          const n = relevantMeasurements.length
          avgValue = sum / n
        } else if (avgMethod === "weighted") {
          // Inverse "time distance" to timestep
          const timesToIntervalEnd = relevantMeasurements.map(
            m => 1 / (timestep.getTime() - m.timestamp.getTime() || 1)
          )
          const weightSum = timesToIntervalEnd.reduce((sum, t) => sum + t, 0)
          const weights = timesToIntervalEnd.map(t => t / weightSum)
          avgValue = relevantMeasurements.reduce(
            (avg, m, i) => avg + m.value * weights[i],
            0
          )
        }

        timestepMeasurements[timestep.toISOString()].push(
          new SensorMeasurement(sensor, avgValue)
        )
      }
    }
  }

  const allOutputFiles = []
  for (const timestep of allTimesteps) {
    const measurements = timestepMeasurements[timestep.toISOString()]

    const geoJSONFeatures = []
    measurements.forEach(m => {
      const { sensor } = m
      // Another extra boundary check
      if (
        sensor.latitude < south ||
        sensor.latitude > north ||
        sensor.longitude < west ||
        sensor.longitude > east
      ) {
        return
      }

      geoJSONFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [sensor.longitude, sensor.latitude],
        },
        properties: {
          id: sensor.id,
          value: m.value,
          avgInterval: options["avg-interval"],
          source: sensor.source,
          timestep: timestep.toISOString(),
          pollutant: options.pollutant,
          "marker-color": sensor.markerColor,
        },
      })
    })

    const outputGeojson = {
      type: "FeatureCollection",
      features: geoJSONFeatures,
    }

    console.log(
      `Total numbers of measurements for ${timestep.toISOString()}:`,
      outputGeojson.features.length
    )

    const filepath = join(
      outputDir,
      `data_${getDateString(timestep)}T${getTimeString(timestep)}.geojson`
    )
    fs.writeFileSync(filepath, JSON.stringify(outputGeojson, null, 2))
    allOutputFiles.push(filepath)
  }

  return allOutputFiles
}

if (CLIOptions.run) {
  downloadAirData()
}

module.exports = downloadAirData
