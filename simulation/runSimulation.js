const { join, basename, resolve } = require("path")
const fs = require("fs")
const commandLineUsage = require("command-line-usage")

const parseCLIOptions = require("../shared/parseCLIOptions")
const configOptionDefinition = require("./configOptionDefinition")
const { validateOptions, runBash, logSection } = require("../shared/helpers")

const modes = {
  osm: "osm",
  matsim: "matsim",
}

// Parse and validate CLI options
const CLIOptionDefinitions = [
  {
    name: "config",
    alias: "c",
    type: String,
    description: "Filepath to the config file",
    required: true,
  },
  {
    name: "config-info",
    alias: "i",
    type: String,
    description: "Print a usage guide for all config parameters",
  },
]
const CLIOptions = parseCLIOptions(CLIOptionDefinitions)
if (CLIOptions["config-info"] !== undefined) {
  const sections = [
    {
      header: `Explanation of all config parameters`,
      optionList: configOptionDefinition,
    },
  ]
  console.log(commandLineUsage(sections))
  process.exit(0)
}
validateOptions(CLIOptions, CLIOptionDefinitions)

// Parse and validate config.json file
const config = JSON.parse(fs.readFileSync(CLIOptions.config), "utf8")
validateOptions(config, configOptionDefinition)

// File and directory names
const simName = basename(CLIOptions.config).match(/.*(?=\.)/)[0]
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

// Importing necessary helper scripts
// I import them here because I need to call "parseCLIOptions" first to make my generalized CLI printing work correctly
const getAirData = require("../airdata/getAirData")
const convertGeoJSONToPoly = require("../sumo/convertGeoJSONToPoly")
const writeSUMOConfig = require("../sumo/writeSUMOConfig")
const prepareMATSim = require("./prepareMATSim")
const prepareOSM = require("./prepareOSM")

async function run() {
  // 1. Prepare network and demand input data according to mode
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
  logSection("Prepare Air Data")
  // Download air data
  console.log("Downloading air pollution data...")
  const airDataFiles = await getAirData({
    pollutant: config.pollutant,
    bbox: config.bbox,
    date: config.simulationDate,
    timestep: config.zoneUpdateInterval,
    output: airDataInput,
  })
  console.log("Done!\n")

  // There will be a measurements file for every timestep
  console.log("Creating air pollution zones...")
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
    console.log("Air pollution zones already exist")
  }

  console.log("\nDone!\n")

  // 3. Write SUMO config file
  logSection("Prepare SUMO Simulation")
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

  // 4. Start the SUMO simulation
  console.log("Starting simulation...")
  await runBash([
    `python ${join(__dirname, "..", "sumo", "traci", "index.py")}`,
    `--config ${resolve(CLIOptions.config)}`,
    `--sumo-config ${sumoConfigFile}`,
  ])
  console.log("Done!\n")
}

run()
