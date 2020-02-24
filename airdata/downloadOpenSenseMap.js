/* eslint-disable no-underscore-dangle */

const fs = require("fs")
const axios = require("axios")
const { getDateString, getTimeString } = require("../shared/helpers")

async function downloadOpenSenseMap(options) {
  const pollutantMapping = {
    PM10: "PM10",
    "PM2.5": "PM2.5",
  }

  const pollutant = pollutantMapping[options.pollutant]

  const baseUrl = "https://api.opensensemap.org"

  const [south, west, north, east] = options.bbox
  const bbox = [west, south, east, north]

  const allBoxesURL = [baseUrl, "/boxes", `?bbox=${bbox.join(",")}`, "&format=json"].join("")
  const { data: allBoxes } = await axios.get(allBoxesURL)
  const allPhenomenons = allBoxes.reduce(
    (set, b) => set.add(...b.sensors.map(s => s.title)),
    new Set()
  )
  const numberOfSensorForMeasurement = allBoxes.filter(b =>
    b.sensors.some(s => s.title === pollutant)
  ).length

  const measurementDate = options.datetime
  const specificMeasurementURL = [
    baseUrl,
    "/boxes/data",
    `?bbox=${bbox.join(",")}`,
    `&phenomenon=${pollutant}`,
    `&from-date=${new Date(measurementDate - 1000 * 60 * 5).toISOString()}`,
    `&to-date=${measurementDate.toISOString()}`,
    "&format=json",
  ].join("")

  const { data: rawMeasurements } = await axios.get(specificMeasurementURL)
  const measurements = rawMeasurements.reduce((collection, m) => {
    if (collection[m.sensorId]) {
      if (collection[m.sensorId].createdAt > m.createdAt) {
        collection[m.sensorId] = m
      }
    } else {
      collection[m.sensorId] = m
    }
    return collection
  }, {})

  const outputGeojson = {
    type: "FeatureCollection",
    features: Object.values(measurements).map(m => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(m.lon), parseFloat(m.lat)],
        },
        properties: {
          sensorId: m.sensorId,
          pollutant: options.pollutant,
          timestamp: m.createdAt,
          value: parseFloat(m.value),
        },
      }
    }),
  }

  // fs.writeFileSync(
  //   `./data/open-sense-map-${getDateString()}T${getTimeString()}.geojson`,
  //   JSON.stringify(outputGeojson, null, 2)
  // )

  return outputGeojson
}

// downloadOpenSenseMap()

module.exports = downloadOpenSenseMap
