const { join } = require("path")
const fs = require("fs")

const { logSection } = require("../shared/helpers")

const filterMATSimNetwork = require("../network/matsim/filterMATSimNetwork")
const convertMATSimNetwork = require("../network/matsim/convertMATSimNetwork")
const filterTrips = require("../demand/filterTrips")
const convertTripsToRoutes = require("../demand/convertTripsToRoutes")

module.exports = async (inputFiles, { networkDir, demandDir }, config) => {
  const networkName = "network"
  const routesName = "demand"

  const rootDir = join(__dirname, "..")
  const matsimNetworkFile = join(
    rootDir,
    "network",
    "matsim",
    "network",
    "berlin-v5-network.xml"
  )
  const filteredNetworkFile = `${join(networkDir, networkName)}-filtered.xml`
  const networkFile = `${join(networkDir, networkName)}.net.xml`
  const tripsFile = `${join(demandDir, routesName)}.trips.xml`
  const routesFile = `${join(demandDir, routesName)}.rou.xml`

  // 1. Prepare network data
  logSection("Prepare Network Data")
  // Filter MATSim network for bbox and remove public transport
  console.log(
    "Filtering MATSim network for bbox and removing public transport..."
  )
  if (fs.existsSync(filteredNetworkFile)) {
    console.log("Filtered MATSim network file already exists")
  } else {
    await filterMATSimNetwork({
      network: matsimNetworkFile,
      output: filteredNetworkFile,
      bbox: config.bbox,
      "filter-pt": true,
    })
  }

  console.log("Done!\n")

  // Convert filtered network to SUMO format
  console.log("Converting filtered MATSim network to SUMO network...")
  if (fs.existsSync(networkFile)) {
    console.log("Converted filtered MATSim network file already exists")
  } else {
    await convertMATSimNetwork({
      network: filteredNetworkFile,
      output: networkFile,
    })
  }

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
      "write-trips": true,
    })
  }

  console.log("Done!\n")

  inputFiles.network = networkFile
  inputFiles.routes = routesFile

  // Return object with filepaths for all newly generated input data
  return inputFiles
}
