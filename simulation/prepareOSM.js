const { join } = require("path")
const fs = require("fs")

const { logSection } = require("../shared/helpers")

const downloadFromOverpass = require("../network/osm/downloadFromOverpass")
const convertOSMNetwork = require("../network/osm/convertOSMNetwork")

const convertTripsToRoutes = require("../demand/convertTripsToRoutes")
const filterTrips = require("../demand/filterTrips")
const visualizeRoutes = require("../demand/visualizeRoutes")

module.exports = async (inputDir, config) => {
  const networkDir = join(inputDir, "network")
  const demandDir = join(inputDir, "demand")

  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir)
  }

  if (!fs.existsSync(demandDir)) {
    fs.mkdirSync(demandDir)
  }

  const networkName = "network"
  const routesName = "demand"

  const osmNetworkFile = `${join(networkDir, networkName)}.osm.xml`
  // const matsimPlansFile = join(matsimDir, "plans", "test-pop.xml")
  const networkFile = `${join(networkDir, networkName)}.net.xml`
  const tripsFile = `${join(demandDir, routesName)}.trips.xml`
  const routesFile = `${join(demandDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(
    demandDir,
    routesName
  )}.rou.visualization.xml`

  // 1. Prepare network data
  logSection("Prepare Network Data")
  // 1.1. Download OSM from config bbox
  console.log("Downloading OSM Bbox...")
  if (fs.existsSync(osmNetworkFile)) {
    console.log("OSM Network file already exists")
  } else {
    await downloadFromOverpass({
      bbox: config.bbox,
      output: osmNetworkFile,
    })
  }

  console.log("Done!\n")

  // 1.2. Convert OSM network to SUMO network
  console.log("Converting OSM network to SUMO network...")
  if (fs.existsSync(networkFile)) {
    console.log("Converted OSM network file already exists")
  } else {
    await convertOSMNetwork({
      input: osmNetworkFile,
      output: networkFile,
    })
  }

  console.log("Done!\n")

  // 2. Prepare demand data
  logSection("Prepare Demand Data")
  // 2.1. Filter the preconverted MATSim trips file for all trips within the bbox
  console.log("Filter preconverted MATSim plans for given bbox...")
  if (fs.existsSync(tripsFile)) {
    console.log("Trips file already exists")
  } else {
    await filterTrips({
      bbox: config.bbox,
      scenario: config.scenario,
      output: tripsFile,
    })
  }

  console.log("Done!\n")

  // 2.2. Convert trips into SUMO routes with the SUMO network
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

  // 2.3 Create visualization of routes for preview
  // console.log("Creating a visualization of SUMO routes...")
  // if (fs.existsSync(routesVisualizationFile)) {
  //   console.log("Routes visualization file already exists")
  // } else {
  //   await visualizeRoutes({
  //     routes: routesFile,
  //     network: networkFile,
  //     output: routesVisualizationFile,
  //   })
  // }
  // console.log("Done!\n")

  const outputFiles = {
    network: networkFile,
    trips: tripsFile,
    routes: routesFile,
    routesVisualization: routesVisualizationFile,
  }

  // Return object of filepaths for all newly generated input data
  return outputFiles
}
