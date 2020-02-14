const { join } = require("path")
const fs = require("fs")

const prepareMATSim = require("./helpers/prepareMATSim")
const prepareOSM = require("./helpers/prepareOSM")
const { validateOptions } = require("../shared/helpers")
const parseCLIOptions = require("../shared/parseCLIOptions")

const modes = {
  osm: "osm",
  matsim: "matsim",
}

const scenarios = {
  "1pct": "1pct",
  "10pct": "10pct",
}

const optionDefinitions = [
  { name: "config", type: String, description: "Filepath to the config file" },
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

const CLIOptions = parseCLIOptions(optionDefinitions)

const config = JSON.parse(fs.readFileSync(CLIOptions.config || "config.json"), "utf8")

validateOptions(config, optionDefinitions)

const inputDir = join(__dirname, "input")

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

async function run() {
  // 1. Prepare input data according to mode
  // console.log("------------ Prepare Input Data ------------")
  let inputFiles = null
  switch (config.mode) {
    case modes.osm:
      inputFiles = await prepareOSM(config)
      break
    case modes.matsim:
      inputFiles = await prepareMATSim(config)
      break
    default:
      break
  }
}

run()
