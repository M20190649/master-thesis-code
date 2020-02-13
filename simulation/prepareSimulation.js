const { join } = require("path")
const fs = require("fs")
const commandLineArgs = require("command-line-args")

const prepareMATSim = require("./helpers/prepareMATSim")
const prepareOSM = require("./helpers/prepareOSM")
const { runBash } = require("../shared/helpers")

const modes = {
  osm: "OSM",
  matsim: "MATSIM",
}
const optionDefinitions = [
  { name: "config", type: String },
  { name: "mode", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.config === undefined) {
  throw new Error("You must specify a path to a config JSON file")
}

// eslint-disable-next-line import/no-dynamic-require
const config = JSON.parse(fs.readFileSync(options.config), "utf8")

let mode = options.mode || config.mode

if (modes[mode] === undefined) {
  throw new Error(`Unknown mode: "${mode}"`)
} else {
  mode = modes[mode]
}

const inputDir = join(__dirname, "input")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

async function run() {
  // 1. Prepare input data according to mode
  console.log("------------ Prepare Input Data ------------")
  let inputFiles = null
  switch (mode) {
    case modes.osm:
      inputFiles = await prepareOSM()
      break
    case modes.matsim:
      inputFiles = await prepareMATSim()
      break
    default:
      break
  }
}

run()
