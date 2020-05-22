const { join, basename } = require("path")
const fs = require("fs")

const { logSection } = require("../shared/helpers")

const filterTrips = require("../demand/filterTrips")
const convertTripsToRoutes = require("../demand/convertTripsToRoutes")

module.exports = async (inputDir, config) => {
  const rootDir = join(__dirname, "..")
  const demandDir = join(inputDir, "demand")

  if (!fs.existsSync(demandDir)) {
    fs.mkdirSync(demandDir)
  }

  // const networkName = `matsim-network`
  const routesName = `${basename(inputDir)}-routes`

  const networkFile = join(
    rootDir,
    "network",
    "matsim",
    "network",
    "berlin-v5-network-converted.net.xml"
  )
  const tripsFile = `${join(demandDir, routesName)}.trips.xml`
  const routesFile = `${join(demandDir, routesName)}.rou.xml`

  // 1. Prepare network data
  logSection("Prepare Network Data")
  // Convert MATSim network to SUMO network
  console.log("Using pre-converted MATSim network...")

  console.log("Done!\n")

  // 2. Prepare routes data
  logSection("Prepare Demand Data")
  // 2.1. Filter the preconverted MATSim trips file for all trips within the bbox
  console.log("Filter preconverted MATSim plans for given bbox...")
  if (fs.existsSync(tripsFile)) {
    console.log("Trips file already exists")
  } else {
    await filterTrips({
      bbox: config.bbox,
      output: tripsFile,
    })
  }

  console.log("Done!\n")

  // Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  if (fs.existsSync(routesFile)) {
    console.log("Routes file already exists")
  } else {
    await convertTripsToRoutes({
      trips: tripsFile,
      network: networkFile,
      output: routesFile,
    })
  }

  console.log("Done!\n")

  const outputFiles = {
    network: networkFile,
    trips: tripsFile,
    routes: routesFile,
  }

  // Return object of filepaths for all newly generated input data
  return outputFiles
}
