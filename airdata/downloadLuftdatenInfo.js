const fs = require("fs")
const { join } = require("path")
const axios = require("axios")

const Measurement = require("./Measurement")
const { getDateString, downloadFile } = require("../shared/helpers")

const luftdatenInfoSensors = require("./data/luftdaten-info-sensors.json")

const pollutantMapping = {
  PM10: "P1",
  "PM2.5": "P2",
}

// These sensors were handpicked from http://deutschland.maps.sensor.community/
const malfunctioningSensors = [2115, 12695, 24509]

function aggregateMeasurements(filepath, options) {
  const pollutant = pollutantMapping[options.pollutant]
  const csv = fs.readFileSync(filepath, "utf8")
  const rows = csv.split("\n")
  const header = rows.shift().split(";")

  const values = {}
  let currentTimeStep = new Date(options.date.getTime() + options.timestep * 60 * 1000)
  let sum = 0
  let counter = 0
  for (const row of rows) {
    const rowData = row.split(";").reduce((data, value, i) => {
      data[header[i]] = value
      return data
    }, {})

    const tsDate = new Date(`${rowData.timestamp}Z`)
    if (tsDate <= currentTimeStep) {
      // When measurement value is within current timestep add it to sum
      sum += parseFloat(rowData[pollutant])
      counter++
    } else {
      // We reached the end of the time step
      // Calculate the average and add it to the result object
      if (sum > 0 && counter > 0) {
        values[currentTimeStep.toISOString()] = sum / counter
      }

      currentTimeStep = new Date(currentTimeStep.getTime() + options.timestep * 60 * 1000)
      sum = 0
      counter = 0
    }
  }
  return values
}

async function downloadFromLuftdatenInfoArchive(options) {
  console.log("Downloading from Luftdaten.info")
  const pollutant = pollutantMapping[options.pollutant]
  const [south, west, north, east] = options.bbox

  // API does not allow to filter the data for timestamps
  // So I need to access the archives and filter manually

  // Make a request to the API and get the latest measurements for the given bbox
  try {
    const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
    const apiURL = `${baseUrl}/box=${options.bbox.join("%2C")}`
    const { data: latestMeasurements } = await axios.get(apiURL, { timeout: 10000 })

    // Check if there are new ones that should be added to the backup list
    const backupIdList = luftdatenInfoSensors.sensors.map(s => s.sensor.id)
    let newSensorCounter = 0
    for (const measurement of latestMeasurements) {
      const sensorIndex = backupIdList.indexOf(measurement.sensor.id)
      if (sensorIndex !== -1) {
        // Update sensor
        // luftdatenInfoSensors.sensors[sensorIndex] = measurement
      } else {
        newSensorCounter++
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

    const isPM = s.sensordatavalues.some(v => {
      return v.value_type === pollutant
    })
    if (!isPM) return false

    let { latitude: lat, longitude: long } = s.location
    lat = parseFloat(lat)
    long = parseFloat(long)
    const isInBbox = lat >= south && lat <= north && long >= west && long <= east
    if (!isInBbox) return false

    return true
  })

  console.log(`All sensors: ${luftdatenInfoSensors.sensors.length}`)
  console.log(`${options.pollutant} sensors: ${filteredSensors.length}`)

  // const sensorTypeCount = filteredSensors.reduce((counts, m) => {
  //   const { name } = m.sensor.sensor_type
  //   if (counts[name]) {
  //     counts[name]++
  //   } else {
  //     counts[name] = 1
  //   }
  //   return counts
  // }, {})
  // console.log(sensorTypeCount)

  // Now we know which sensors report PM values in the given bbox

  // Measurements object will contain a list of sensors with their averages values for every timestep
  const measurements = {}
  let errorCounter = 0
  const dateString = getDateString(options.date)
  for (const s of filteredSensors) {
    let timestepValues = {}

    const filename = `${s.sensor.sensor_type.name.toLowerCase()}_sensor_${s.sensor.id}.csv`
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
          "http://archive.luftdaten.info/",
          `${dateString}/`,
          `${dateString}_`,
          filename,
        ].join("")
        await downloadFile(requestURL, filepath)
      } catch (error) {
        errorCounter++
        continue
      }
    }

    timestepValues = aggregateMeasurements(filepath, options)

    for (const [timestep, value] of Object.entries(timestepValues)) {
      const measurementObj = new Measurement(
        s.sensor.id,
        value,
        "luftdaten.info",
        parseFloat(s.location.latitude),
        parseFloat(s.location.longitude)
      )
      if (measurements[timestep]) {
        measurements[timestep].push(measurementObj)
      } else {
        measurements[timestep] = [measurementObj]
      }
    }
  }

  // console.log(Object.values(measurements)[0])

  console.log(`Archive sensor data errors: ${errorCounter} `)

  return measurements
}

module.exports = downloadFromLuftdatenInfoArchive
