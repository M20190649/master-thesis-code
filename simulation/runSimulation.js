const { join } = require("path")
const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, runBash } = require("../shared/helpers")

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
const outputDir = join(inputDir, "output")
const airQualityZonesGeoJSONFile = join(__dirname, "air-quality-test-zones.geojson")
const airQualityZonesPolygonFile = join(inputDir, "air-quality-zones-polygons.xml")
const sumoConfigFile = `${join(inputDir, config.name)}.sumocfg`

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

const convertGeoJSONToPoly = require("../sumo/convertGeoJSONToPoly")
const writeSUMOConfig = require("../sumo/writeSUMOConfig")
const prepareMATSim = require("./prepareMATSim")
const prepareOSM = require("./prepareOSM")

async function run() {
  // 1. Prepare network and demand input data according to mode
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

  // 2. Prepare air quality zone polygons
  await convertGeoJSONToPoly({
    geojson: airQualityZonesGeoJSONFile,
    network: inputFiles.network,
    output: airQualityZonesPolygonFile,
  })

  // 3. Write SUMO config file
  console.log("Writing SUMO config file...")
  writeSUMOConfig(outputDir, {
    ...inputFiles,
    sumoConfigFile,
    polygonsFile: airQualityZonesPolygonFile,
  })
  console.log("Done!\n")

  console.log("Starting simulation...")
  await runBash(
    `py ${join(__dirname, "..", "sumo", "traci", "index.py")} --config ${sumoConfigFile}`
  )
  console.log("Done!\n")
}

run()
