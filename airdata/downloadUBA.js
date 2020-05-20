const fs = require("fs")
const { join } = require("path")
const axios = require("axios")

const Measurement = require("./Measurement")
const { getDateString } = require("../shared/helpers")

const ubaSensorFile = fs.readFileSync("./data/uba-sensors.geojson", "utf-8")
const { features: ubaSensors } = JSON.parse(ubaSensorFile)

const pollutantMapping = {
  PM10: 1,
  CO: 2,
  O3: 3,
  SO2: 4,
  NO2: 5,
}

function getAllTimesteps(options) {
  const timesteps = []

  let currentTimestep = new Date(
    options.date.getTime() + options.timestep * 60 * 1000
  )
  const endTimestep = new Date(options.date.getTime() + 24 * 60 * 60 * 1000)
  while (currentTimestep <= endTimestep) {
    timesteps.push(currentTimestep)
    currentTimestep = new Date(
      currentTimestep.getTime() + options.timestep * 60 * 1000
    )
  }

  return timesteps
}

async function downloadFromUmweltBundesamtAPI(options) {
  console.log("Downloading from Umwelt Bundesamt")
  const pollutant = pollutantMapping[options.pollutant]
  const [south, west, north, east] = options.bbox
  const timeout = 20000

  const measurements = {}
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

    let ubaData = null

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
          return measurements
        }

        errorCounter += 1
      }
    }

    if (!ubaData) {
      if (!fs.existsSync(filepath)) {
        console.log(`No data for sensor ${code}_${name.replace(" ", "_")}`)
        continue
      } else {
        ubaData = JSON.parse(fs.readFileSync(filepath, "utf-8"))
        fileReuseCount += 1
      }
    }

    const allTimesteps = getAllTimesteps(options)

    const data = Object.entries(ubaData.data[id])

    if (Object.keys(data).length === 0) {
      console.log(`No data for sensor ${code}_${name.replace(" ", "_")}`)
      continue
    }

    // There seems to be a bug that the measurements are not sorted sometimes
    // eslint-disable-next-line no-loop-func
    data.sort((a, b) => {
      const aTime = parseFloat(a[0].split(" ")[1].split(":")[0])
      const bTime = parseFloat(b[0].split(" ")[1].split(":")[0])

      return aTime - bTime
    })

    const values = data.map(([key, value]) => value[2])

    for (let i = 0; i < allTimesteps.length; i += 1) {
      const timestep = allTimesteps[i].toISOString()

      const measurementObj = new Measurement(
        id,
        values[i],
        "uba",
        parseFloat(lat),
        parseFloat(long)
      )
      if (measurements[timestep]) {
        measurements[timestep].push(measurementObj)
      } else {
        measurements[timestep] = [measurementObj]
      }
    }
  }

  console.log(`Reused archive files: ${fileReuseCount}`)
  console.log(`New downloaded files: ${newFileCount}`)
  console.log(`Sensor data errors: ${errorCounter}`)

  return measurements
}

module.exports = downloadFromUmweltBundesamtAPI
