const fs = require("fs")
const { join } = require("path")
const axios = require("axios")

const { Sensor, Measurement } = require("./Models")
const { getDateString, downloadFile } = require("../shared/helpers")

const luftdatenInfoSensors = require("./data/luftdaten-info-sensors.json")

const pollutantMapping = {
  PM10: "P1",
  "PM2.5": "P2",
}

// These sensors were handpicked from http://deutschland.maps.sensor.community/
const malfunctioningSensors = [2115, 12695, 24509]

function getMeasurements(filepath, options) {
  const pollutant = pollutantMapping[options.pollutant]
  const csv = fs.readFileSync(filepath, "utf8")
  const rows = csv.split("\n")
  const header = rows.shift().split(";")

  if (rows[rows.length - 1] === "") {
    rows.pop()
  }

  const measurements = rows.map(row => {
    const rowData = row.split(";").reduce((data, value, i) => {
      data[header[i]] = value
      return data
    }, {})
    return new Measurement(
      rowData[pollutant],
      new Date(`${rowData.timestamp}Z`)
    )
  })

  return measurements
}

async function downloadFromLuftdatenInfoArchive(options) {
  console.log("Downloading from Luftdaten.info")
  const pollutant = pollutantMapping[options.pollutant]
  const [south, west, north, east] = options.bbox
  const timeout = 20000

  // API does not allow to filter the data for timestamps
  // So I need to access the archives and filter manually

  // Make a request to the API and get the latest measurements for the given bbox
  try {
    const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
    const apiURL = `${baseUrl}/box=${options.bbox.join("%2C")}`
    const { data: latestMeasurements } = await axios.get(apiURL, { timeout })

    // Check if there are new ones that should be added to the backup list
    let newSensorCounter = 0
    for (const measurement of latestMeasurements) {
      const idList = luftdatenInfoSensors.sensors.map(s => s.sensor.id)
      const sensorIndex = idList.indexOf(measurement.sensor.id)
      if (sensorIndex !== -1) {
        // Sensor is already in the list
        // luftdatenInfoSensors.sensors[sensorIndex] = measurement
      } else {
        newSensorCounter += 1
        luftdatenInfoSensors.sensors.push(measurement)
      }
    }

    if (newSensorCounter > 0) {
      console.log("New sensors: ", newSensorCounter)
    }

    fs.writeFileSync(
      join(__dirname, "data", "luftdaten-info-sensors.json"),
      JSON.stringify(luftdatenInfoSensors, null, 2)
    )
  } catch (error) {
    console.log("Error when fetching latest measurements:", error.message)
    console.log("Using backup sensor list instead")
  }

  // We filter all measurements for the following things:
  // 1. Is not one of the malfunctioning sensors
  // 2. Reports PM (or other given pollutant)
  // 3. Is inside given bbox
  const filteredSensors = luftdatenInfoSensors.sensors.filter(s => {
    const isMalfunctioning = malfunctioningSensors.includes(s.sensor.id)
    if (isMalfunctioning) return false

    const isPM = s.sensordatavalues.some(v => v.value_type === pollutant)
    if (!isPM) return false

    let { latitude: lat, longitude: long } = s.location
    lat = parseFloat(lat)
    long = parseFloat(long)
    const isInBbox =
      lat >= south && lat <= north && long >= west && long <= east
    if (!isInBbox) return false

    return true
  })

  console.log(`All sensors: ${luftdatenInfoSensors.sensors.length}`)
  console.log(`${options.pollutant} sensors: ${filteredSensors.length}`)

  // const sensorTypeCount = filteredSensors.reduce((counts, m) => {
  //   const { name } = m.sensor.sensor_type
  //   if (counts[name]) {
  //     counts[name] += 1
  //   } else {
  //     counts[name] = 1
  //   }
  //   return counts
  // }, {})
  // console.log(sensorTypeCount)

  // Now we know which sensors report PM values in the given bbox

  // Measurements object will contain a list of sensors with their averages values for every timestep
  const sensors = []
  let fileReuseCount = 0
  let newFileCount = 0
  let errorCounter = 0
  let timeoutCounter = 0
  const dateString = getDateString(options.date)
  for (const s of filteredSensors) {
    const filename = `${s.sensor.sensor_type.name.toLowerCase()}_sensor_${
      s.sensor.id
    }.csv`
    // Check if sensor data for the given date has already been downloaded
    const dir = join(__dirname, "data", dateString, "luftdaten.info")
    const filepath = join(dir, filename)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(filepath)) {
      // Data has not been downloaded yet
      // Access the archives for the specific sensor
      try {
        const requestURL = [
          "https://archive.sensor.community/",
          `${dateString}/`,
          `${dateString}_`,
          filename,
        ].join("")
        await downloadFile(requestURL, filepath, timeout)
        newFileCount += 1
      } catch (error) {
        if (error.message.match(/timeout/gi)) {
          timeoutCounter += 1
        }

        const timeoutLimit = 5
        if (timeoutCounter > timeoutLimit) {
          console.log(`More than ${timeoutLimit} archive requests timed out`)
          console.log("Stopping the download from Luftdaten.info")
          return sensors
        }

        errorCounter += 1
        continue
      }
    } else {
      fileReuseCount += 1
    }

    const sensorObj = new Sensor(
      s.sensor.id,
      filepath,
      "luftdaten.info",
      parseFloat(s.location.longitude),
      parseFloat(s.location.latitude)
    )
    sensors.push(sensorObj)
  }

  console.log(`Reused archive files: ${fileReuseCount}`)
  console.log(`New downloaded archive files: ${newFileCount}`)
  console.log(`Archive sensor data errors: ${errorCounter}`)

  return sensors
}

module.exports = {
  download: downloadFromLuftdatenInfoArchive,
  getMeasurements,
}
