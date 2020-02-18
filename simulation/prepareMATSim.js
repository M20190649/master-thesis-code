const { join } = require("path")
const fs = require("fs")

const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")
const convertTripsToRoutes = require("../sumo/convertTripsToRoutes")
const visualizeRoutes = require("../sumo/visualizeRoutes")

const convertPlansToTrips = require("../matsim/convertPlansToTrips")

module.exports = async (config = {}) => {
  const rootDir = join(__dirname, "..")
  const inputDir = join(rootDir, "simulation", config.name || "input")
  const matsimDir = join(rootDir, "matsim")
  const sumoDir = join(rootDir, "sumo")

  const networkName = `matsim-network`
  const routesName = `matsim-routes`

  const matsimNetworkFile = join(matsimDir, "network", "berlin-v5-network.xml")
  const networkFile = join(matsimDir, "network", "berlin-v5-network-converted.net.xml")
  const matsimPlans = join(matsimDir, "plans", `berlin-v5.4-${config.scenario}.output_plans.xml`)
  const tripsFile = `${join(inputDir, routesName)}.trips.xml`
  const routesFile = `${join(inputDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(inputDir, routesName)}.rou.visualization.xml`

  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")

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
  console.log("------------ Prepare Routes Data ------------")
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

  // 3. Write SUMO config file

  // Return object of filepaths for all newly generated input data
  return {
    network: networkFile,
    trips: tripsFile,
    routes: routesFile,
    routesVisualization: routesVisualizationFile,
  }
}
