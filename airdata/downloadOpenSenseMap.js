/* eslint-disable no-underscore-dangle */

const fs = require("fs")
const axios = require("axios")

const Measurement = require("./Measurement")
const { getDateString, getTimeString } = require("../shared/helpers")

const pollutantMapping = {
  PM10: "PM10",
  "PM2.5": "PM2.5",
}

function getArchiveURLFromSenseBox(options, pollutant, box) {
  let url = `https://uni-muenster.sciebo.de/index.php/s/HyTbguBP4EkqBcp/download?path=/data/`
  url += `${getDateString(options.date)}/`
  const name = box.name.replace(/ |,|'/gi, "_").replace(/ß|ö|ä|ü/gi, "__")
  url += `${box._id}-${name}/`
  const sensorId = box.sensors.find(s => s.title === pollutant)._id
  url += `${sensorId}-${getDateString(options.date)}.csv`
  return url
}

async function downloadOpenSenseMapArchive(options) {
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
  let errorCounter = 0
  for (const box of pmBoxes) {
    try {
      const { data: csv } = await axios.get(getArchiveURLFromSenseBox(options, pollutant, box))
      const rows = csv.split("\n")
      const header = rows.shift().split(",")

      let currentTimeStep = new Date(options.date.getTime() + options.timestep * 60 * 1000)
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
        }
      }
    } catch (error) {
      // Some will fail because they are not available
      errorCounter++
    }
  }

  // console.log(measurements)
  console.log("OpenSenseMap")
  console.log(`All sensors: ${senseBoxes.length}`)
  console.log(`PM sensors: ${pmBoxes.length}`)
  console.log(`Archive sensor data errors: ${errorCounter} `)

  return measurements
}

module.exports = {
  downloadOpenSenseMapArchive,
}
