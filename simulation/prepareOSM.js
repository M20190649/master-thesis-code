const { join, basename } = require("path")
const fs = require("fs")

const { logSection } = require("../shared/helpers")

const downloadFromOverpass = require("../osm/downloadFromOverpass")

const convertPlansToTrips = require("../matsim/convertPlansToTrips")

const convertOSMNetwork = require("../sumo/convertOSMNetwork")
const convertTripsToRoutes = require("../sumo/convertTripsToRoutes")
const visualizeRoutes = require("../sumo/visualizeRoutes")

module.exports = async (inputDir, config) => {
  const rootDir = join(__dirname, "..")
  const matsimDir = join(rootDir, "matsim")
  const networkDir = join(inputDir, "network")
  const demandDir = join(inputDir, "demand")

  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir)
  }

  if (!fs.existsSync(demandDir)) {
    fs.mkdirSync(demandDir)
  }

  const networkName = `${basename(inputDir)}-network`
  const routesName = `${basename(inputDir)}-routes`

  const osmNetworkFile = `${join(networkDir, networkName)}.osm.xml`
  const matsimPlansFile = join(
    matsimDir,
    "plans",
    `berlin-v5.4-${config.scenario}.output_plans.xml`
  )
  // const matsimPlansFile = join(matsimDir, "plans", "test-pop.xml")
  const networkFile = `${join(networkDir, networkName)}.net.xml`
  const tripsFile = `${join(demandDir, routesName)}.trips.xml`
  const routesFile = `${join(demandDir, routesName)}.rou.xml`
  const routesVisualizationFile = `${join(demandDir, routesName)}.rou.visualization.xml`

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
