const { join } = require("path")
const fs = require("fs")

const downloadFromOverpass = require("../osm/downloadFromOverpass")

const convertPlansToTrips = require("../matsim/convertPlansToTrips")

const convertOSMNetwork = require("../sumo/convertOSMNetwork")
const convertTripsToRoutes = require("../sumo/convertTripsToRoutes")
const visualizeRoutes = require("../sumo/visualizeRoutes")
const writeSUMOConfig = require("../sumo/writeSUMOConfig")

module.exports = async (inputDir, config) => {
  const rootDir = join(__dirname, "..")
  const matsimDir = join(rootDir, "matsim")

  const networkName = `${config.name}-network`
  const routesName = `${config.name}-routes`

  const osmNetworkFile = `${join(inputDir, networkName)}.osm.xml`
  const matsimPlansFile = join(matsimDir, "plans", "berlin-v5.4-1pct.output_plans.xml")
  // const matsimPlansFile = join(matsimDir, "plans", "test-pop.xml")
  const networkFile = `${join(inputDir, networkName)}.net.xml`
  const tripsFile = `${join(inputDir, routesName)}.trips.xml`
  const routesFile = `${join(inputDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(inputDir, routesName)}.rou.visualization.xml`
  const sumoConfigFile = `${join(inputDir, config.name)}.sumocfg`

  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")
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

  // 2. Prepare routes data
  console.log("------------ Prepare Routes Data ------------")
  // 2.1. Parse all the plans for the bbox and convert them to trips
  console.log("Parsing MATSim plans for given Bbox...")
  if (fs.existsSync(tripsFile)) {
    console.log("Trips file already exists")
  } else {
    await convertPlansToTrips({
      bbox: config.bbox,
      plans: matsimPlansFile,
      mode: "geo",
      output: tripsFile,
      // verbose: true,
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
    })
  }

  console.log("Done!\n")

  // 2.3 Create visualization of routes for preview
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
    sumoConfig: sumoConfigFile,
  }

  // 3. Write SUMO config file
  console.log("Writing SUMO config file...")
  writeSUMOConfig(inputDir, outputFiles)
  console.log("Done!\n")

  // Return object of filepaths for all newly generated input data
  return outputFiles
}
