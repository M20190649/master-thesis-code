const fs = require("fs")
const axios = require("axios")

const { getDateString, getTimeString } = require("../shared/helpers")

async function downloadFromOpenSenseNetwork(pollutant) {
  const pollutantMapping = {
    PM10: 11,
    "PM2.5": 12,
  }
  const baseUrl = "https://www.opensense.network/beta/api/v1.0/sensors"
  const berlinBbox = [52.301761, 13.040771, 52.714667, 13.827667]
  const url =
    `${baseUrl}?measurandId=${pollutantMapping[pollutant]}` +
    `&boundingBox=%5B${berlinBbox.join("%2C")}%5D`

  axios
    .get(url)
    .then(res => {
      return res.data
    })
    .then(berlinSensors => {
      // const
    })
}

async function downloadFromLuftdatenInfo(options) {
  const pollutantMapping = {
    PM10: "P1",
    "PM2.5": "P2",
  }

  const pollutant = pollutantMapping[options.pollutant]

  // API does not allow to filter the data for timestamps
  // So I need to access the archives and filter manually

  // Make a request to the API and get the latest measurements for the given bbox
  const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
  const apiURL = `${baseUrl}/box=${options.bbox.join("%2C")}`
  const { data: measurements } = await axios.get(apiURL)
  // We filter all measurements for all the unique ones that report PM values (or other given pollutant)
  const pmMeasurements = measurements
    .filter(m => {
      return m.sensordatavalues.some(v => {
        return v.value_type === pollutant
        // return v.value_type === "P1" || v.value_type === "P2"
      })
    })
    .reduce((uniqueMeasurements, curr) => {
      if (!uniqueMeasurements.map(m => m.sensor.id).includes(curr.sensor.id)) {
        uniqueMeasurements.push(curr)
      }
      return uniqueMeasurements
    }, [])

  // Now we know which sensors report PM values in the given bbox
  // Now we access the archives for all of these sensors for the given data
  const timeFilteredPMMeasurements = []
  for (const m of pmMeasurements) {
    let requestURL = ""
    try {
      requestURL = [
        "http://archive.luftdaten.info/",
        `${getDateString(options.datetime)}/`,
        `${getDateString(options.datetime)}_`,
        `${m.sensor.sensor_type.name.toLowerCase()}_sensor_${m.sensor.id}.csv`,
      ].join("")
      // Archives return CSV data
      // We parse it into an array of measurement objects
      const { data: csv } = await axios.get(requestURL)
      const rows = csv.split("\n")
      const header = rows[0].split(";")

      // Then we filter for the measurement that is the closest to the given time
      // eslint-disable-next-line no-loop-func
      const closestMeasurement = rows
        .slice(1)
        .map(r => {
          const data = {}
          r.split(";").forEach((value, i) => {
            data[header[i]] = value
          })
          return data
        })
        .filter(measurement => {
          const timestamp = new Date(measurement.timestamp)
          return timestamp < options.datetime
        })
        .pop()
      if (closestMeasurement !== undefined) {
        timeFilteredPMMeasurements.push(closestMeasurement)
      }
    } catch (error) {
      // console.log(requestURL)
      // console.log(error.message)
    }

    // break
  }

  console.log(`All measurements in bbox: ${measurements.length}`)
  console.log(`PM Measurements in bbox: ${pmMeasurements.length}`)
  console.log(`PM Measurements in bbox at given time: ${timeFilteredPMMeasurements.length}`)

  const pmMeasurementsGeojson = {
    type: "FeatureCollection",
    features: pmMeasurements.map(m => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(m.location.longitude), parseFloat(m.location.latitude)],
        },
        properties: {
          sensorId: parseFloat(m.sensor.id),
          timestamp: m.timestamp,
          pollutant: options.pollutant,
          value: parseFloat(m.sensordatavalues.find(v => v.value_type === pollutant).value),
        },
      }
    }),
  }

  const timeFilteredPMMeasurementsGeojson = {
    type: "FeatureCollection",
    features: timeFilteredPMMeasurements.map(m => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(m.lon), parseFloat(m.lat)],
        },
        properties: {
          sensorId: parseFloat(m.sensor_id),
          timestamp: m.timestamp,
          pollutant: options.pollutant,
          value: parseFloat(m[pollutant]),
        },
      }
    }),
  }

  // const outputGeojson = pmMeasurementsGeojson
  const outputGeojson = timeFilteredPMMeasurementsGeojson

  // fs.writeFileSync(
  //   `./data/luftinfo_pm_${getDateString()}T${getTimeString()}.geojson`,
  //   JSON.stringify(outputGeojson, null, 2)
  // )

  return outputGeojson
}

module.exports = downloadFromLuftdatenInfo
