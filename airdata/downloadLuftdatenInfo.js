const fs = require("fs")
const axios = require("axios")

const Measurement = require("./Measurement")
const { getDateString, getTimeString } = require("../shared/helpers")

const pollutantMapping = {
  PM10: "P1",
  "PM2.5": "P2",
}

// These sensors were handpicked from http://deutschland.maps.sensor.community/
const malfunctioningSensors = [2115, 12695, 24509]

async function downloadFromLuftdatenInfoArchive(options) {
  const pollutant = pollutantMapping[options.pollutant]

  // API does not allow to filter the data for timestamps
  // So I need to access the archives and filter manually

  // Make a request to the API and get the latest measurements for the given bbox
  const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
  const apiURL = `${baseUrl}/box=${options.bbox.join("%2C")}`
  const { data: allLatestMeasurements } = await axios.get(apiURL)
  // We filter all measurements for all the unique ones that report PM values (or other given pollutant)
  const pmMeasurements = allLatestMeasurements
    .filter(m => {
      return m.sensordatavalues.some(v => {
        return v.value_type === pollutant
      })
    })
    .reduce((uniqueMeasurements, curr) => {
      if (!uniqueMeasurements.map(m => m.sensor.id).includes(curr.sensor.id)) {
        uniqueMeasurements.push(curr)
      }
      return uniqueMeasurements
    }, [])
    .filter(m => !malfunctioningSensors.includes(m.sensor.id))

  // fs.writeFileSync("luftdatenInfoExampleStations.json", JSON.stringify(pmMeasurements, null, 2))

  // Now we know which sensors report PM values in the given bbox
  // Now we access the archives for all of these sensors for the given data

  // Measurements object will contain a list of sensors with averages values for every timestep
  const measurements = {}
  let errorCounter = 0
  for (const m of pmMeasurements) {
    let requestURL = ""
    try {
      requestURL = [
        "http://archive.luftdaten.info/",
        `${getDateString(options.date)}/`,
        `${getDateString(options.date)}_`,
        `${m.sensor.sensor_type.name.toLowerCase()}_sensor_${m.sensor.id}.csv`,
      ].join("")
      // Archives return CSV data
      // We parse it into an array of measurement objects
      const { data: csv } = await axios.get(requestURL)
      const rows = csv.split("\n")
      const header = rows.shift().split(";")

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
            const measurementObj = new Measurement(
              m.sensor.id,
              sum / counter,
              "luftdaten.info",
              parseFloat(m.location.latitude),
              parseFloat(m.location.longitude)
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
      errorCounter++
      // console.log(requestURL)
      // console.log(error.message)
    }
  }

  // console.log(Object.values(measurements)[0])
  console.log("Luftdaten.info")
  console.log(`All sensors: ${allLatestMeasurements.length}`)
  console.log(`PM sensors: ${pmMeasurements.length}`)
  console.log(`Archive sensor data errors: ${errorCounter} `)

  return measurements
}

module.exports = { downloadFromLuftdatenInfoAPI, downloadFromLuftdatenInfoArchive }
