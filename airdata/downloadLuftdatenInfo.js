const fs = require("fs")
const axios = require("axios")

function pad(number) {
  if (number < 10) {
    return "0" + number
  }
  return String(number)
}

const dateToString = date => {
  return (
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "-" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  )
}

function downloadFromOpenSenseNetwork(pollutant) {
  const pollutantMapping = {
    pm10: 11,
    pm2_5: 12,
  }
  const baseUrl = "https://www.opensense.network/beta/api/v1.0/sensors"
  const berlinBbox = [52.301761, 13.040771, 52.714667, 13.827667]
  const url =
    baseUrl +
    `?measurandId=${pollutantMapping[pollutant]}` +
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
    pm10: "P1",
    pm2_5: "P2",
  }
  const baseUrl = "http://data.sensor.community/airrohr/v1/filter"
  const berlinBbox = [52.301761, 13.040771, 52.714667, 13.827667]
  const url = baseUrl + `/box=${berlinBbox.join("%2C")}`

  axios
    .get(url)
    .then(res => res.data)
    .then(measurements => {
      // Filter measurements for PM and remove duplicates
      const pmMeasurements = measurements
        .filter(m => {
          return m.sensordatavalues.some(v => {
            // return v.value_type === pollutantMapping[pollutant]
            return v.value_type === "P1" || v.value_type === "P2"
          })
        })
        .reduce((uniqueMeasurements, curr) => {
          if (!uniqueMeasurements.map(m => m.sensor.id).includes(curr.sensor.id)) {
            uniqueMeasurements.push(curr)
          }
          return uniqueMeasurements
        }, [])

      console.log("All measurements: " + measurements.length)
      console.log("PM Measurements: " + pmMeasurements.length)

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

      fs.writeFileSync(
        `./data/luftinfo_pm_${dateToString(new Date())}.geojson`,
        JSON.stringify(outputGeojson, null, 2)
      )
    })
}

const pollutants = {
  pm10: "pm10",
  pm2_5: "pm2_5",
}

// downloadFromOpenSenseNetwork(pollutants.pm10)

downloadFromLuftdatenInfo(pollutants.pm10)
