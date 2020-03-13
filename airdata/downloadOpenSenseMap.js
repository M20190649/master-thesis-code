/* eslint-disable no-underscore-dangle */

const fs = require("fs")
const axios = require("axios")

const Measurement = require("./Measurement")
const { getDateString, getTimeString } = require("../shared/helpers")

async function downloadOpenSenseMapAPI(options) {
  const pollutantMapping = {
    PM10: "PM10",
    "PM2.5": "PM2.5",
  }

  const pollutant = pollutantMapping[options.pollutant]

  const baseUrl = "https://api.opensensemap.org"

  const [south, west, north, east] = options.bbox
  const bbox = [west, south, east, north]

  const allBoxesURL = [baseUrl, "/boxes", `?bbox=${bbox.join(",")}`, "&format=json"].join("")
  const { data: allBoxes } = await axios.get(allBoxesURL)
  const allPhenomenons = allBoxes.reduce(
    (set, b) => set.add(...b.sensors.map(s => s.title)),
    new Set()
  )
  const numberOfSensorForMeasurement = allBoxes.filter(b =>
    b.sensors.some(s => s.title === pollutant)
  ).length

  const specificMeasurementURL = [
    baseUrl,
    "/boxes/data",
    `?bbox=${bbox.join(",")}`,
    `&phenomenon=${pollutant}`,
    `&from-date=${options.from.toISOString()}`,
    `&to-date=${options.to.toISOString()}`,
    "&format=json",
  ].join("")

  const { data: rawMeasurements } = await axios.get(specificMeasurementURL)

  const measurements = rawMeasurements.reduce((collection, m) => {
    if (collection[m.sensorId]) {
      if (collection[m.sensorId].createdAt > m.createdAt) {
        collection[m.sensorId] = m
      }
    } else {
      collection[m.sensorId] = m
    }
    return collection
  }, {})

  const outputGeojson = {
    type: "FeatureCollection",
    features: Object.values(measurements).map(m => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(m.lon), parseFloat(m.lat)],
        },
        properties: {
          sensorId: m.sensorId,
          pollutant: options.pollutant,
          timestamp: m.createdAt,
          value: parseFloat(m.value),
        },
      }
    }),
  }

  // fs.writeFileSync(
  //   `./data/open-sense-map-${getDateString()}T${getTimeString()}.geojson`,
  //   JSON.stringify(outputGeojson, null, 2)
  // )

  return outputGeojson
}

function getArchiveURLFromSenseBox(options, pollutant, box) {
  let url = `https://uni-muenster.sciebo.de/index.php/s/HyTbguBP4EkqBcp/download?path=/data/`
  url += `${getDateString(options.from)}/`
  const name = box.name.replace(/ |,|'/gi, "_").replace(/ß|ö|ä|ü/gi, "__")
  url += `${box._id}-${name}/`
  const sensorId = box.sensors.find(s => s.title === pollutant)._id
  url += `${sensorId}-${getDateString(options.from)}.csv`
  return url
}

async function downloadOpenSenseMapArchive(options) {
  const pollutantMapping = {
    PM10: "PM10",
    "PM2.5": "PM2.5",
  }

  const pollutant = pollutantMapping[options.pollutant]

  const [south, west, north, east] = options.bbox
  const bbox = [west, south, east, north]

  const senseBoxesURL = `https://api.opensensemap.org/boxes?bbox=${bbox.join(
    ","
  )}&phenomenon=${pollutant}&format=json`

  const { data: senseBoxes } = await axios.get(senseBoxesURL)

  // Filter for all boxes that have PM values
  const pmBoxes = senseBoxes.filter(b => {
    return b.sensors.some(s => s.title === pollutant)
  })

  // fs.writeFileSync("stations.json", JSON.stringify(pmBoxes, null, 2))

  // Measurements object will contain a list of sensors with averages values for every timestep
  const measurements = {}

  for (const box of pmBoxes) {
    try {
      const { data: csv } = await axios.get(getArchiveURLFromSenseBox(options, pollutant, box))
      const rows = csv.split("\n")
      const header = rows.shift().split(",")

      let currentTimeStep = new Date(options.from.getTime() + options.timestep * 60 * 1000)
      let sum = 0
      let counter = 0
      for (const row of rows) {
        const [ts, value] = row.split(",")
        const tsDate = new Date(ts)
        if (tsDate <= currentTimeStep) {
          // When measurement value is within current timestep add it to sum
          sum += parseFloat(value)
          counter++
        } else {
          // We reached the end of the time step
          // Calculate the average and add it to the result object
          if (sum > 0 && counter > 0) {
            const measurementObj = new Measurement(
              box._id,
              sum / counter,
              "openSenseMap",
              parseFloat(box.currentLocation.coordinates[1]),
              parseFloat(box.currentLocation.coordinates[0])
            )
            if (measurements[currentTimeStep.toISOString()]) {
              measurements[currentTimeStep.toISOString()].push(measurementObj)
            } else {
              measurements[currentTimeStep.toISOString()] = [measurementObj]
            }
          }

          currentTimeStep = new Date(currentTimeStep.getTime() + options.timestep * 60 * 1000)
          sum = 0
          counter = 0

          if (currentTimeStep > options.to) {
            break
          }
        }
      }
    } catch (error) {
      // Some will fail because they are not available
      continue
    }
  }

  // console.log(measurements)
  console.log("OpenSenseMap")
  console.log(`All sensors: ${senseBoxes.length}`)
  console.log(`PM sensors: ${pmBoxes.length}`)
  console.log(
    `Available PM measurements: ${
      Object.values(measurements)[0] ? Object.values(measurements)[0].length : 0
    }`
  )
  console.log()

  return measurements
}

// downloadOpenSenseMapAPI()

module.exports = {
  downloadOpenSenseMapAPI,
  downloadOpenSenseMapArchive,
}
