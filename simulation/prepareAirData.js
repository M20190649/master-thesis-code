/* eslint-disable no-loop-func */
const { join, basename } = require("path")
const fs = require("fs")

const pLimit = require("p-limit")

const { runBash } = require("../shared/helpers")
const getAirData = require("../airdata/getAirData")
const convertGeoJSONToPoly = require("../sumo/convertGeoJSONToPoly")

module.exports = async (
  { network },
  { rawAirDataDir, interpolatedAirDataDir },
  config
) => {
  // Download air data
  console.log("Download and aggregate air pollution data...")
  const airDataFiles = await getAirData({
    pollutant: config.pollutant,
    bbox: config.bbox,
    date: config.simulationDate,
    timestep: config.zoneUpdateInterval,
    "avg-interval": config.averagingInterval,
    "avg-method": config.averagingMethod,
    output: rawAirDataDir,
  })
  console.log("Done!\n")

  // There will be a measurements file for every timestep
  console.log("Creating air pollution zones...")
  const zonesFiles = fs
    .readdirSync(interpolatedAirDataDir)
    .filter(f => f.endsWith(".geojson"))
  if (zonesFiles.length === 0) {
    const interpolationlimit = pLimit(3)
    const promises = []
    for (const airDataFile of airDataFiles) {
      // Interpolate measurements
      const promise = interpolationlimit(() =>
        runBash([
          `python ${join(__dirname, "..", "airdata", "interpolate.py")}`,
          `--measurements=${airDataFile}`,
          `--method=${config.interpolationMethod}`,
          `--zones=${config.zones.join(",")}`,
          `--output=${interpolatedAirDataDir}`,
        ])
      )
      promises.push(promise)
    }

    await Promise.all(promises)
  } else {
    console.log("Interpolated air pollution zones already exist")
  }

  const polygonFiles = fs
    .readdirSync(interpolatedAirDataDir)
    .filter(f => f.endsWith(".xml"))
  if (polygonFiles.length === 0) {
    // Air pollutions zones are given as GeoJSON
    // Convert all GeoJSON files to SUMO poly format
    const conversionlimit = pLimit(5)
    const promises = []
    for (const airDataFile of airDataFiles) {
      // Convert the resulting zones into SUMO poly format
      const promise = conversionlimit(() =>
        convertGeoJSONToPoly({
          geojson: join(
            interpolatedAirDataDir,
            `${basename(airDataFile).replace("data", "zones")}`
          ),
          network,
          output: join(
            interpolatedAirDataDir,
            basename(airDataFile)
              .replace("data", "zones")
              .replace(".geojson", ".xml")
          ),
        })
      )
      promises.push(promise)
    }

    await Promise.all(promises)
  } else {
    console.log("Air pollution zone polygon files already exist")
  }
}
