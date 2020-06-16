const { join, basename, resolve, dirname } = require("path")
const fs = require("fs")
const commandLineUsage = require("command-line-usage")
const pLimit = require("p-limit")

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
    name: "gui",
    alias: "g",
    type: Boolean,
    description: "Run simulation in SUMO GUI",
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
const inputDir = join(resolve(dirname(CLIOptions.config)), simName)
const airDataDir = join(inputDir, "airdata")
const rawAirData = join(airDataDir, `${config.pollutant}-raw`)
const interpolatedAirData = join(
  airDataDir,
  `${config.pollutant}-${config.interpolationMethod}`
)
const outputDir = join(inputDir, "output")
const sumoConfigFile = `${join(inputDir, simName)}.sumocfg`

const requiredDirs = [
  inputDir,
  outputDir,
  airDataDir,
  rawAirData,
  interpolatedAirData,
]

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
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
  console.log("Download and aggregate air pollution data...")
  const airDataFiles = await getAirData({
    pollutant: config.pollutant,
    bbox: config.bbox,
    date: config.simulationDate,
    timestep: config.zoneUpdateInterval,
    "avg-interval": config.averagingInterval,
    "avg-method": config.averagingMethod,
    output: rawAirData,
  })
  console.log("Done!\n")

  // There will be a measurements file for every timestep
  console.log("Creating air pollution zones...")
  const zonesFiles = fs.readdirSync(interpolatedAirData)
  if (zonesFiles.length === 0) {
    const interpolationlimit = pLimit(3)
    let promises = []
    for (const airDataFile of airDataFiles) {
      // Interpolate measurements
      const promise = interpolationlimit(() =>
        runBash([
          `python ${join(__dirname, "..", "airdata", "interpolate.py")}`,
          `--measurements=${airDataFile}`,
          `--method=${config.interpolationMethod}`,
          `--zones=${config.zones.join(",")}`,
          `--output=${interpolatedAirData}`,
        ])
      )
      promises.push(promise)
    }

    await Promise.all(promises)

    const conversionlimit = pLimit(Infinity)
    promises = []
    for (const airDataFile of airDataFiles) {
      // Convert the resulting zones into SUMO poly format
      const promise = conversionlimit(() =>
        convertGeoJSONToPoly({
          geojson: join(
            interpolatedAirData,
            `${basename(airDataFile).replace("data", "zones")}`
          ),
          network: inputFiles.network,
          output: join(
            interpolatedAirData,
            basename(airDataFile)
              .replace("data", "zones")
              .replace(".geojson", ".xml")
          ),
        })
      )
      promises.push(promise)
    }

    await Promise.all(promises)
  } else {
    console.log("Air pollution zones already exist")
  }

  console.log("\nDone!\n")

  // 3. Write SUMO config file
  logSection("Prepare SUMO Simulation")
  console.log("Writing SUMO config file...")
  writeSUMOConfig(
    sumoConfigFile,
    {
      ...inputFiles,
    },
    outputDir,
    config
  )

  console.log("Done!\n")

  // 4. Start the SUMO simulation
  console.log("Starting simulation...")
  await runBash([
    `python ${join(__dirname, "..", "sumo", "traci", "index.py")}`,
    `--config ${resolve(CLIOptions.config)}`,
    `--sumo-config ${sumoConfigFile}`,
    `${CLIOptions.gui ? "--gui=true" : ""}`,
  ])
  console.log("Done!\n")
}

run()
