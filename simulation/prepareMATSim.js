const { join, basename } = require("path")
const fs = require("fs")

const { logSection } = require("../shared/helpers")

const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")
const convertTripsToRoutes = require("../sumo/convertTripsToRoutes")
const visualizeRoutes = require("../sumo/visualizeRoutes")

const convertPlansToTrips = require("../matsim/convertPlansToTrips")

module.exports = async (inputDir, config) => {
  const rootDir = join(__dirname, "..")
  const matsimDir = join(rootDir, "matsim")
  // const networkDir = join(inputDir, "network")
  const demandDir = join(inputDir, "demand")

  // if (!fs.existsSync(networkDir)) {
  //   fs.mkdirSync(networkDir)
  // }

  if (!fs.existsSync(demandDir)) {
    fs.mkdirSync(demandDir)
  }

  // const networkName = `matsim-network`
  const routesName = `${basename(inputDir)}-routes`

  const matsimNetworkFile = join(matsimDir, "network", "berlin-v5-network.xml")
  const networkFile = join(matsimDir, "network", "berlin-v5-network-converted.net.xml")
  const matsimPlans = join(matsimDir, "plans", `berlin-v5.4-${config.scenario}.output_plans.xml`)
  const tripsFile = `${join(demandDir, routesName)}.trips.xml`
  const routesFile = `${join(demandDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(demandDir, routesName)}.rou.visualization.xml`

  // 1. Prepare network data
  logSection("Prepare Network Data")
  // Convert MATSim network to SUMO network
  console.log("Converting MATSim network to SUMO network...")
  if (fs.existsSync(networkFile)) {
    console.log("Converted network already exists")
  } else {
    await convertMATSimNetwork({
      network: matsimNetworkFile,
      output: networkFile,
    })
  }

  console.log("Done!\n")

  // 2. Prepare routes data
  logSection("Prepare Demand Data")
  // Parse all the plans for the bbox and convert them to trips
  console.log("Converting the MATSim plans...")
  if (fs.existsSync(tripsFile)) {
    console.log("Trips file already exists")
  } else {
    await convertPlansToTrips({
      plans: matsimPlans,
      mode: "matsim",
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

  // Create visualization of routes for preview
  console.log("Creating a visualization of SUMO routes...")
  if (fs.existsSync(routesVisualizationFile)) {
    console.log("Routes visualization file already exists")
  } else {
    await visualizeRoutes({
      routes: routesFile,
      network: networkFile,
      output: routesVisualizationFile,
    })
  }

  console.log("Done!\n")

  const outputFiles = {
    network: networkFile,
    trips: tripsFile,
    routes: routesFile,
    routesVisualization: routesVisualizationFile,
  }

  // Return object of filepaths for all newly generated input data
  return outputFiles
}
