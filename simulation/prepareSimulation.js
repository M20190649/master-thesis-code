const { join } = require("path")
const fs = require("fs")
const commandLineArgs = require("command-line-args")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [{ name: "config", type: String }]
const options = commandLineArgs(optionDefinitions)

if (options.config === undefined) {
  throw new Error("Error: You must specify a path to a config JSON file")
}

// eslint-disable-next-line import/no-dynamic-require
const config = require(options.config)

const inputDir = join(__dirname, "input")
const osmDir = join(__dirname, "..", "osm")
const matsimDir = join(__dirname, "..", "matsim")
const sumoDir = join(__dirname, "..", "sumo")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

const networkName = `${config.networkName || "sim"}-network`
const routesName = `${config.routesName || "sim"}-routes`

async function run() {
  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")
  // 1.1. Download OSM from config bbox
  console.log("Downloading OSM Bbox...")
  await runBash([
    "node",
    join(osmDir, "downloadFromOverpass.js"),
    `--bbox=${config.bbox.join(",")}`,
    `--output=${join(inputDir, networkName)}.osm.xml`,
  ])
  console.log("Done!\n")

  // 1.2. Convert OSM network to SUMO network
  console.log("Converting OSM network to SUMO network...")
  await runBash([
    "node",
    join(sumoDir, "convertOSMNetwork.js"),
    `--input=${join(inputDir, networkName)}.osm.xml`,
    `--output=${join(inputDir, networkName)}.net.xml`,
  ])
  console.log("Done!\n")

  // 2. Prepare routes data
  console.log("------------ Prepare Routes Data ------------")
  // 2.1. Parse all the plans for the bbox and convert them to trips
  console.log("Parsing MATSim plans for given Bbox...")
  await runBash([
    "node",
    join(matsimDir, "plan-parser", "index.js"),
    `--bbox=${config.bbox.join(",")}`,
    `--output=${join(inputDir, routesName)}.trips.xml`,
  ])
  console.log("Done!\n")

  // 2.2. Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  await runBash([
    "node",
    join(sumoDir, "convertTripsToRoutes.js"),
    `--trips=${join(inputDir, routesName)}.trips.xml`,
    `--network=${join(inputDir, networkName)}.net.xml`,
    `--output=${join(inputDir, routesName)}.rou.xml`,
  ])
  console.log("Done!\n")

  // 2.3 Create visualization of routes for preview
  console.log("Creating a visualization of SUMO routes...")
  await runBash([
    "node",
    join(sumoDir, "visualizeRoutes.js"),
    `--routes=${join(inputDir, routesName)}.rou.xml`,
    `--network=${join(inputDir, networkName)}.net.xml`,
    `--output=${join(inputDir, routesName)}.rou.visualization.xml`,
  ])
  console.log("Done!\n")

  // 3. Write SUMO config file
}

run()
