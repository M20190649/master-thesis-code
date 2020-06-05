const fs = require("fs")
const { join } = require("path")
const axios = require("axios")

const { Sensor, Measurement } = require("./Models")
const { getDateString } = require("../shared/helpers")

const ubaSensorFile = fs.readFileSync(
  join(__dirname, "data", "uba-sensors.geojson"),
  "utf-8"
)
const { features: ubaSensors } = JSON.parse(ubaSensorFile)

const pollutantMapping = {
  PM10: 1,
  CO: 2,
  O3: 3,
  SO2: 4,
  NO2: 5,
}

function getMeasurements(filepath) {
  const ubaData = JSON.parse(fs.readFileSync(filepath, "utf-8"))

  const [id, dataObj] = Object.entries(ubaData.data)[0]
  const data = Object.values(dataObj)

  const valueIndex = 2
  const dateIndex = 3

  // Transform data into Date object
  data.forEach(d => {
    const [dateString, timeString] = d[dateIndex].split(" ")
    const date = new Date(`${dateString}T${timeString}Z`)
    d[dateIndex] = date
  })

  // There seems to be a bug that the measurements are not sorted sometimes
  // eslint-disable-next-line no-loop-func
  data.sort((a, b) => a[dateIndex] - b[dateIndex])

  const measurements = data.map(
    d => new Measurement(d[valueIndex], d[dateIndex])
  )

  return measurements
}

async function downloadFromUmweltBundesamtAPI(options) {
  console.log("Downloading from Umwelt Bundesamt")
  const pollutant = pollutantMapping[options.pollutant]
  const [south, west, north, east] = options.bbox
  const timeout = 20000

  const sensors = []
  let fileReuseCount = 0
  let newFileCount = 0
  let errorCounter = 0
  let timeoutCounter = 0
  const dateString = getDateString(options.date)

  for (const s of ubaSensors) {
    const { id, code, name } = s.properties
    const [long, lat] = s.geometry.coordinates

    if (!s.properties[options.pollutant]) {
      // If the sensor does not report the given pollutant skip it
      continue
    }

    const isInBbox =
      lat >= south && lat <= north && long >= west && long <= east
    if (!isInBbox) {
      continue
    }

    const filename = `${code}_${name.replace(" ", "-")}.json`
    const dir = join(__dirname, "data", dateString, "uba")
    const filepath = join(dir, filename)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(filepath)) {
      // Data has not been downloaded yet
      try {
        const requestURL = [
          "https://www.umweltbundesamt.de/api/air_data/v2/measures/json",
          `?date_from=${dateString}`,
          `&date_to=${dateString}`,
          "&time_from=1",
          "&time_to=24",
          `&station=${id}`,
          `&component=${pollutant}`,
        ].join("")
        const { data } = await axios.get(requestURL, { timeout })

        ubaData = data

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
        newFileCount += 1
      } catch (error) {
        if (error.message.match(/timeout/gi)) {
          timeoutCounter += 1
        }

        const timeoutLimit = 5
        if (timeoutCounter > timeoutLimit) {
          console.log(`More than ${timeoutLimit} archive requests timed out`)
          console.log("Stopping the download from Umwelt Bundesamt")
          return sensors
        }

        errorCounter += 1
      }
    } else {
      fileReuseCount += 1
    }

    const sensorObj = new Sensor(
      id,
      filepath,
      "uba",
      parseFloat(long),
      parseFloat(lat)
    )
    sensors.push(sensorObj)
  }

  console.log(`Reused archive files: ${fileReuseCount}`)
  console.log(`New downloaded files: ${newFileCount}`)
  console.log(`Sensor data errors: ${errorCounter}`)

  return sensors
}

module.exports = {
  download: downloadFromUmweltBundesamtAPI,
  getMeasurements,
}
