/* eslint-disable no-underscore-dangle */

const fs = require("fs")
const { join } = require("path")
const axios = require("axios")

const { Sensor, Measurement } = require("./Models")
const { getDateString, downloadFile } = require("../shared/helpers")

const openSenseMapSensors = require("./data/open-sense-map-sensors.json")

const pollutantMapping = {
  PM10: "PM10",
  "PM2.5": "PM2.5",
}

function getMeasurements(filepath) {
  const csv = fs.readFileSync(filepath, "utf8")
  const rows = csv.split("\n")

  if (rows[rows.length - 1] === "") {
    rows.pop()
  }

  const measurements = rows.map(row => {
    const [ts, value] = row.split(",")
    return new Measurement(value, new Date(ts))
  })

  return measurements
}

function getArchiveURLFromSenseBox(box, options) {
  const pollutant = pollutantMapping[options.pollutant]
  let url = `https://uni-muenster.sciebo.de/index.php/s/HyTbguBP4EkqBcp/download?path=/data/`
  url += `${getDateString(options.date)}/`
  const name = box.name.replace(/ |,|'/gi, "_").replace(/ß|ö|ä|ü/gi, "__")
  url += `${box._id}-${name}/`
  const sensorId = box.sensors.find(s => s.title === pollutant)._id
  url += `${sensorId}-${getDateString(options.date)}.csv`
  return url
}

async function downloadOpenSenseMapArchive(options) {
  console.log("Downloading from OpenSenseMap")
  const pollutant = pollutantMapping[options.pollutant]
  const [south, west, north, east] = options.bbox
  const timeout = 20000

  try {
    const apiBbox = [west, south, east, north]
    const senseBoxesURL = `https://api.opensensemap.org/boxes?bbox=${apiBbox.join(
      ","
    )}&phenomenon=${pollutant}&format=json`
    const { data: senseBoxes } = await axios.get(senseBoxesURL, { timeout })

    // Check if there are new ones that should be added to the backup list
    let newSensorCounter = 0
    for (const sensor of senseBoxes) {
      const idList = openSenseMapSensors.sensors.map(s => s._id)
      const sensorIndex = idList.indexOf(sensor._id)
      if (sensorIndex !== -1) {
        // Sensor is already in the list
        // openSenseMapSensors.sensors[sensorIndex] = sensor
      } else {
        newSensorCounter += 1
        openSenseMapSensors.sensors.push(sensor)
      }
    }

    if (newSensorCounter > 0) {
      console.log("New sensors: ", newSensorCounter)
    }

    fs.writeFileSync(
      join(__dirname, "data", "open-sense-map-sensors.json"),
      JSON.stringify(openSenseMapSensors, null, 2)
    )
  } catch (error) {
    console.log("Error when fetching latest measurements:", error.message)
    console.log("Using backup sensor list instead")
  }

  // We filter all measurements for the following things:
  // 1. Reports PM (or other given pollutant)
  // 2. Is inside given bbox
  const filteredSensors = openSenseMapSensors.sensors.filter(s => {
    const isPM = s.sensors.some(v => v.title === pollutant)
    if (!isPM) return false

    const [long, lat] = s.currentLocation.coordinates
    const isInBbox =
      lat >= south && lat <= north && long >= west && long <= east
    if (!isInBbox) return false

    return true
  })

  console.log(`All sensors: ${openSenseMapSensors.sensors.length}`)
  console.log(`${options.pollutant} sensors: ${filteredSensors.length}`)

  // Now we know which sensors report PM values in the given bbox

  // Measurements object will contain a list of sensors with their averages values for every timestep
  const sensors = []
  let fileReuseCount = 0
  let newFileCount = 0
  let errorCounter = 0
  let timeoutCounter = 0
  const dateString = getDateString(options.date)
  for (const s of filteredSensors) {
    const archiveURL = getArchiveURLFromSenseBox(s, options)
    // Check if sensor data for the given date has already been downloaded
    const dir = join(__dirname, "data", dateString, "openSenseMap")
    const filename = archiveURL.split("/").pop()
    const filepath = join(dir, filename)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(filepath)) {
      // Data has not been downloaded yet
      // Access the archives for the specific sensor
      try {
        await downloadFile(archiveURL, filepath, timeout)
        newFileCount += 1
      } catch (error) {
        if (error.message.match(/timeout/gi)) {
          timeoutCounter += 1
        }

        const timeoutLimit = 5
        if (timeoutCounter > timeoutLimit) {
          console.log(`More than ${timeoutLimit} archive requests timed out`)
          console.log("Stopping the download from OpenSenseMap")
          return sensors
        }

        errorCounter += 1
        continue
      }
    } else {
      fileReuseCount += 1
    }

    const sensorObj = new Sensor(
      s._id,
      filepath,
      "openSenseMap",
      parseFloat(s.currentLocation.coordinates[0]),
      parseFloat(s.currentLocation.coordinates[1])
    )
    sensors.push(sensorObj)
  }

  console.log(`Reused archive files: ${fileReuseCount}`)
  console.log(`New downloaded archive files: ${newFileCount}`)
  console.log(`Archive sensor data errors: ${errorCounter}`)

  return sensors
}

module.exports = {
  download: downloadOpenSenseMapArchive,
  getMeasurements,
}
