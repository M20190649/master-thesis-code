const { join } = require("path")
const fs = require("fs")

const downloadFromOverpass = require("../osm/downloadFromOverpass")

const convertPlansToTrips = require("../matsim/convertPlansToTrips")

const convertOSMNetwork = require("../sumo/convertOSMNetwork")
const convertTripsToRoutes = require("../sumo/convertTripsToRoutes")
const visualizeRoutes = require("../sumo/visualizeRoutes")

module.exports = async config => {
  const rootDir = join(__dirname, "..")
  const inputDir = join(rootDir, "simulation", config.name || "input")
  const matsimDir = join(rootDir, "matsim")
  const sumoDir = join(rootDir, "sumo")

  const networkName = `${config.networkName || "osm"}-network`
  const routesName = `${config.routesName || "osm"}-routes`

  const osmFile = `${join(inputDir, networkName)}.osm.xml`
  const matsimPlans = join(matsimDir, "plans", "berlin-v5.4-1pct.output_plans.xml")
  // const matsimPlans = join(matsimDir, "plans", "test-pop.xml")
  const networkFile = `${join(inputDir, networkName)}.net.xml`
  const tripsFile = `${join(inputDir, routesName)}.trips.xml`
  const routesFile = `${join(inputDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(inputDir, routesName)}.rou.visualization.xml`

  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")
  // 1.1. Download OSM from config bbox
  console.log("Downloading OSM Bbox...")
  await downloadFromOverpass({
    bbox: config.bbox,
    output: osmFile,
  })
  console.log("Done!\n")

  // 1.2. Convert OSM network to SUMO network
  console.log("Converting OSM network to SUMO network...")
  await convertOSMNetwork({
    input: osmFile,
    output: networkFile,
  })
  console.log("Done!\n")

  // 2. Prepare routes data
  console.log("------------ Prepare Routes Data ------------")
  // 2.1. Parse all the plans for the bbox and convert them to trips
  console.log("Parsing MATSim plans for given Bbox...")
  await convertPlansToTrips({
    bbox: config.bbox,
    plans: matsimPlans,
    mode: "geo",
    output: tripsFile,
    // verbose: true,
  })
  console.log("Done!\n")

  // 2.2. Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  await convertTripsToRoutes({
    trips: tripsFile,
    network: networkFile,
    output: routesFile,
  })
  console.log("Done!\n")

  // 2.3 Create visualization of routes for preview
  console.log("Creating a visualization of SUMO routes...")
  await visualizeRoutes({
    routes: routesFile,
    network: networkFile,
    output: routesVisualizationFile,
  })
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
