const fs = require("fs")
const axios = require("axios")

const { getDateString, getTimeString } = require("../shared/helpers")

function downloadFromOpenSenseNetwork(pollutant) {
  const pollutantMapping = {
    pm10: 11,
    pm2_5: 12,
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

function downloadFromLuftdatenInfo(pollutant) {
  const pollutantMapping = {
    PM10: "P1",
    "PM2.5": "P2",
  }
  const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
  const berlinBbox = [52.301761, 13.040771, 52.714667, 13.827667]
  const url = `${baseUrl}/box=${berlinBbox.join("%2C")}`

  axios
    .get(url)
    .then(res => res.data)
    .then(measurements => {
      // Filter measurements for PM and remove duplicates
      const pmMeasurements = measurements
        .filter(m => {
          return m.sensordatavalues.some(v => {
            return v.value_type === pollutantMapping[pollutant]
            // return v.value_type === "P1" || v.value_type === "P2"
          })
        })
        .reduce((uniqueMeasurements, curr) => {
          if (!uniqueMeasurements.map(m => m.sensor.id).includes(curr.sensor.id)) {
            uniqueMeasurements.push(curr)
          }
          return uniqueMeasurements
        }, [])

      // console.log(`All measurements: ${measurements.length}`)
      // console.log(`PM Measurements: ${pmMeasurements.length}`)

      const outputGeojson = {
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
              pm1: parseFloat(m.sensordatavalues[0].value),
              pm2: parseFloat(m.sensordatavalues[1].value),
            },
          }
        }),
      }

      // fs.writeFileSync(
      //   `./data/luftinfo_pm_${getDateString()}T${getTimeString()}.geojson`,
      //   JSON.stringify(outputGeojson, null, 2)
      // )

      return outputGeojson
    })
}

module.exports = downloadFromLuftdatenInfo
