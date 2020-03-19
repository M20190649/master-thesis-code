const { join, basename, resolve } = require("path")
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

const simName = basename(CLIOptions.config).match(/.*(?=\.)/)[0]

validateOptions(config, configOptionDefinitions)

const inputDir = join(__dirname, simName)
const airDataInput = join(inputDir, "airdata")
const outputDir = join(inputDir, "output")
const sumoConfigFile = `${join(inputDir, simName)}.sumocfg`

if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir)
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

const getAirData = require("../airdata/getAirData")
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

  // 2. Download air data and prepare air quality zone polygons
  const simDate = config.simulationDate
    .split(".")
    .reverse()
    .join("-")
  // Download air data
  console.log("Downloading air data...")
  const airDataFiles = await getAirData({
    pollutant: config.pollutant,
    bbox: config.bbox,
    from: new Date(`${simDate}T00:00:00.000Z`),
    to: new Date(`${simDate}T23:59:00.000Z`),
    timestep: config.zoneUpdateInterval,
    output: airDataInput,
  })
  console.log("Done!\n")

  // There will be a measurements file for every timestep
  console.log("Creating air quality zones...")
  const zonesFiles = fs.readdirSync(airDataInput).filter(f => f.startsWith("zones"))
  if (zonesFiles.length === 0) {
    for (const airDataFile of airDataFiles) {
      // Interpolate measurements
      await runBash([
        `python ${join(__dirname, "..", "airdata", "interpolate.py")}`,
        `--measurements=${airDataFile}`,
        `--method=${config.interpolationMethod}`,
        `--zones=${config.zones.join(",")}`,
        `--output=${airDataInput}`,
        `${config.visualizeZones ? `--visualize=true` : ""}`,
      ])

      // Convert the resulting zones into SUMO poly format
      await convertGeoJSONToPoly({
        geojson: join(airDataInput, `${basename(airDataFile).replace("data", "zones")}`),
        network: inputFiles.network,
        output: join(
          airDataInput,
          basename(airDataFile)
            .replace("data", "zones")
            .replace(".geojson", ".xml")
        ),
      })
    }
  } else {
    console.log("Interpolation data already exist")
  }

  console.log("Done!\n")

  // 3. Write SUMO config file
  console.log("Writing SUMO config file...")
  if (!fs.existsSync(sumoConfigFile)) {
    writeSUMOConfig(outputDir, {
      ...inputFiles,
      sumoConfigFile,
    })
  } else {
    console.log("SUMO config file already exists")
  }

  console.log("Done!\n")

  console.log("Starting simulation...")
  await runBash([
    `python ${join(__dirname, "..", "sumo", "traci", "index.py")}`,
    `--config ${resolve(CLIOptions.config)}`,
    `--sumo-config ${sumoConfigFile}`,
  ])
  console.log("Done!\n")
}

run()
