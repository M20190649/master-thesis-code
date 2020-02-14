const { join } = require("path")
const fs = require("fs")

const { runBash } = require("../../shared/helpers")
const convertMATSimNetwork = require("../../sumo/convertMATSimNetwork")
const convertPlansToTrips = require("../../matsim/convertPlansToTrips")

const rootDir = join(__dirname, "..", "..")
const inputDir = join(rootDir, "simulation", "input")
const matsimDir = join(rootDir, "matsim")
const sumoDir = join(rootDir, "sumo")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

module.exports = async (config = {}) => {
  const networkName = `${config.networkName || "matsim"}-network`
  const routesName = `${config.routesName || "matsim"}-routes`

  const matsimNetworkFile = join(matsimDir, "network", "berlin-v5-network.xml")
  const defaultConvertedNetwork = join(matsimDir, "network", "berlin-v5-network-converted.net.xml")
  let networkFile = `${join(inputDir, networkName)}.net.xml`
  const matsimPlans = join(matsimDir, "plans", `berlin-v5.4-${config.scenario}.output_plans.xml`)
  const tripsFile = `${join(inputDir, routesName)}.trips.xml`
  const routesFile = `${join(inputDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(inputDir, routesName)}.rou.visualization.xml`

  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")

  // Convert OSM network to SUMO network
  console.log("Converting MATSim network to SUMO network...")
  if (fs.existsSync(defaultConvertedNetwork)) {
    networkFile = defaultConvertedNetwork
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
  await convertPlansToTrips({
    plans: matsimPlans,
    mode: "matsim",
    output: tripsFile,
  })
  console.log("Done!\n")

  // Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  await runBash([
    "node",
    join(sumoDir, "convertTripsToRoutes.js"),
    `--trips=${tripsFile}`,
    `--network=${networkFile}`,
    `--output=${routesFile}`,
  ])
  console.log("Done!\n")

  // Create visualization of routes for preview
  console.log("Creating a visualization of SUMO routes...")
  await runBash([
    "node",
    join(sumoDir, "visualizeRoutes.js"),
    `--routes=${routesFile}`,
    `--network=${networkFile}`,
    `--output=${routesVisualizationFile}`,
  ])
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
