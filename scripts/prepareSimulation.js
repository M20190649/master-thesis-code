const { join } = require("path")
const fs = require("fs")

const helpers = require("../shared/helpers")
const runBash = require("./runBash")
const config = require("../sumo/simulation-config.json")

const simDir = join(
  __dirname,
  "..",
  "sumo",
  // `simulation_${helpers.getDateString()}T${helpers.getTimeString()}`
  "simulation"
)

if (!fs.existsSync(simDir)) {
  fs.mkdirSync(simDir)
}

const network = "test-network"
const routes = "test-routes"

async function run() {
  // 1. Prepare network data
  console.log("------------ Prepare Network Data ------------")
  // 1.1. Download OSM from config bbox
  console.log("Downloading OSM Bbox...")
  await runBash(
    [
      "node",
      join(__dirname, "..", "osm", "downloadFromOverpass.js"),
      `--bbox=${config.bbox.join(",")}`,
      `--output=${join(simDir, network)}.osm.xml`,
    ].join(" ")
  )
  console.log("Done!\n")

  // 1.2. Convert OSM network to SUMO network
  console.log("Converting OSM network to SUMO network...")
  await runBash(
    [
      "node convertOSMNetwork.js",
      `--input=${join(simDir, network)}.osm.xml`,
      `--output=${join(simDir, network)}.net.xml`,
    ].join(" ")
  )
  console.log("Done!\n")

  // 2. Prepare routes data
  console.log("------------ Prepare Routes Data ------------")
  // 2.1. Parse all the plans for the bbox and convert them to trips
  console.log("Parsing MATSim plans for given Bbox...")
  await runBash(
    [
      "node",
      join(__dirname, "..", "matsim", "plan-parser", "index.js"),
      `--bbox=${config.bbox.join(",")}`,
      `--output=${join(simDir, routes)}-trips.xml`,
    ].join(" ")
  )
  console.log("Done!\n")

  // 2.2. Convert trips into SUMO routes with the SUMO network
  console.log("Converting trips into SUMO routes...")
  await runBash(
    [
      "node convertTripsToRoutes.js",
      // `--input=${join(simDir, networkName)}.osm.xml`,
      `--trips=${join(simDir, routes)}-trips.xml`,
      `--network=${join(simDir, network)}.net.xml`,
      `--output=${join(simDir, routes)}.rou.xml`,
    ].join(" ")
  )
  console.log("Done!\n")

  // 3. Write SUMO config file
}

run()
