const { join } = require("path")
const fs = require("fs")

const { runBash } = require("../../shared/helpers")

const inputDir = join(__dirname, "..", "input")
const osmDir = join(__dirname, "..", "..", "osm")
const matsimDir = join(__dirname, "..", "..", "matsim")
const sumoDir = join(__dirname, "..", "..", "sumo")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

module.exports = async config => {
  const networkName = `${config.networkName || "osm"}-network`
  const routesName = `${config.routesName || "osm"}-routes`

  const osmFile = `${join(inputDir, networkName)}.osm.xml`
  const matsimPlans = join(matsimDir, "plans", "berlin-v5.4-1pct.output_plans.xml")
  const networkFile = `${join(inputDir, networkName)}.net.xml`
  const tripsFile = `${join(inputDir, routesName)}.trips.xml`
  const routesFile = `${join(inputDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(inputDir, routesName)}.rou.visualization.xml`

  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")
  // 1.1. Download OSM from config bbox
  console.log("Downloading OSM Bbox...")
  await runBash([
    "node",
    join(osmDir, "downloadFromOverpass.js"),
    `--bbox=${config.bbox.join(",")}`,
    `--output=${osmFile}`,
  ])
  console.log("Done!\n")

  // 1.2. Convert OSM network to SUMO network
  console.log("Converting OSM network to SUMO network...")
  await runBash([
    "node",
    join(sumoDir, "convertOSMNetwork.js"),
    `--input=${osmFile}`,
    `--output=${networkFile}`,
  ])
  console.log("Done!\n")

  // 2. Prepare routes data
  console.log("------------ Prepare Routes Data ------------")
  // 2.1. Parse all the plans for the bbox and convert them to trips
  console.log("Parsing MATSim plans for given Bbox...")
  await runBash([
    "node",
    join(matsimDir, "planConverter.js"),
    `--plans=${matsimPlans}`,
    `--bbox=${config.bbox.join(",")}`,
    `--mode=geo`,
    `--output=${tripsFile}`,
  ])
  console.log("Done!\n")

  // 2.2. Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  await runBash([
    "node",
    join(sumoDir, "convertTripsToRoutes.js"),
    `--trips=${tripsFile}`,
    `--network=${networkFile}`,
    `--output=${routesFile}`,
  ])
  console.log("Done!\n")

  // 2.3 Create visualization of routes for preview
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
