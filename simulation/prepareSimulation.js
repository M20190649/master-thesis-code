const { join } = require("path")
const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions } = require("../shared/helpers")

const CLIOptionDefinitions = [
  { name: "config", type: String, description: "Filepath to the config file", required: true },
]

const modes = {
  osm: "osm",
  matsim: "matsim",
}

const scenarios = {
  "1pct": "1pct",
  "10pct": "10pct",
}

const configOptionDefinitions = [
  { name: "name", type: String, description: "Name of the simulation", required: true },
  {
    name: "mode",
    type: String,
    description: "Decides from which source the input data is generated",
    required: true,
    possibleValues: Object.values(modes),
  },
  {
    name: "scenario",
    type: String,
    description:
      "The scenario that should be loaded \n (Possible values: 1pct, 10pct, default: 1pct)",
    required: true,
    defaultValue: "1pct",
    possibleValues: Object.values(scenarios),
  },
]

const CLIOptions = parseCLIOptions(CLIOptionDefinitions)

validateOptions(CLIOptions, CLIOptionDefinitions)

const config = JSON.parse(fs.readFileSync(CLIOptions.config), "utf8")

validateOptions(config, configOptionDefinitions)

const inputDir = join(__dirname, config.name || "input")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

const prepareMATSim = require("./prepareMATSim")
const prepareOSM = require("./prepareOSM")

async function run() {
  // 1. Prepare input data according to mode
  // console.log("------------ Prepare Input Data ------------")
  let inputFiles = null
  switch (config.mode) {
    case modes.osm:
      inputFiles = await prepareOSM(inputDir, config)
      break
    case modes.matsim:
      inputFiles = await prepareMATSim(inputDir, config)
      break
    default:
      break
  }
}

run()
