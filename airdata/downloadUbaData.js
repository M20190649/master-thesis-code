const fs = require("fs")
const axios = require("axios")

const stationsGeoJSON = JSON.parse(fs.readFileSync("../berlinSensorStations.geojson"))

function getUmweltBundesamtBerlinStations() {
  const berlinStations = []
  const url = "https://www.umweltbundesamt.de/api/air_data/v2/meta/json?use=measure"
  return axios.get(url).then(res => {
    for (const [id, station] of Object.entries(res.data.stations)) {
      if (station[13] === "Berlin") {
        berlinStations.push(station)
      }
    }
    return berlinStations
  })
}

function getPollutantFromId(pollutantId) {
  return ["pm10", "co", "o3", "so2", "no2"][pollutantId - 1]
}

async function downloadFromUmweltBundesamt(
  pollutant,
  valueType,
  dateFrom,
  timeFrom,
  dateTo,
  timeTo
) {
  const baseURL = "https://www.umweltbundesamt.de/api/air_data/v2/measures/json"
  let apiUrl =
    baseURL +
    `?component=${pollutant}` +
    `&scope=${valueType}` +
    `&date_from=${dateFrom}` +
    `&time_from=${timeFrom}` +
    `&date_to=${dateTo}` +
    `&time_to=${timeTo}`

  for (let i = 0; i < stationsGeoJSON.features.length; i++) {
    const station = stationsGeoJSON.features[i]

    if (station.properties.ubaId === undefined) {
      continue
    }

    const res = await axios.get(apiUrl + `&station=${station.properties.ubaId}`)

    if (Object.keys(res.data.data).length === 0) {
      continue
    }

    station.properties.pollutant = getPollutantFromId(pollutant)
    station.properties.value = Object.values(res.data.data[station.properties.ubaId])[0][2]
    station.properties.measurementDateTime = Object.keys(res.data.data[station.properties.ubaId])[0]
    // console.log(res.data.data)
    // console.log(res.data.indices.data["station id"])
    // console.log(station.properties)
  }

  fs.writeFileSync(
    `./data/measurement_${getPollutantFromId(pollutant)}_${dateFrom}_${timeFrom}.geojson`,
    JSON.stringify(stationsGeoJSON, null, 2)
  )
}

const pollutants = {
  pm10: 1,
  co: 2,
  o3: 3,
  so2: 4,
  no2: 5,
}

const valueType = {
  dailyAvg: 1,
  hourlyAvg: 2,
  hourlyMax: 3,
}

downloadFromUmweltBundesamt(
  pollutants.pm10,
  valueType.hourlyAvg,
  "2019-10-28",
  "9",
  "2019-10-28",
  "9"
)
