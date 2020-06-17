const { join, basename, resolve, dirname } = require("path")
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
    name: "gui",
    alias: "g",
    type: Boolean,
    description: "Run simulation in SUMO GUI",
  },
  {
    name: "prepare",
    alias: "p",
    type: Boolean,
    description: "Only prepare all input data without running the simulation",
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
const simDir = join(resolve(dirname(CLIOptions.config)), simName)
const networkDir = join(simDir, "network")
const demandDir = join(simDir, "demand")
const airDataDir = join(simDir, "airdata")
const rawAirDataDir = join(airDataDir, `${config.pollutant}-raw`)
const interpolatedAirDataDir = join(
  airDataDir,
  `${config.pollutant}-${config.interpolationMethod}`
)
const outputDir = join(simDir, "output")
const sumoConfigFile = `${join(simDir, simName)}.sumocfg`

const directories = {
  simDir,
  networkDir,
  demandDir,
  airDataDir,
  rawAirDataDir,
  interpolatedAirDataDir,
  outputDir,
}

for (const dir of Object.values(directories)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

// Importing necessary helper scripts
// I import them here because I need to call "parseCLIOptions" first to make my generalized CLI printing work correctly
const writeSUMOConfig = require("../sumo/writeSUMOConfig")
const prepareMATSim = require("./prepareMATSim")
const prepareOSM = require("./prepareOSM")
const prepareAirData = require("./prepareAirData")

async function run() {
  // 1. Prepare network and demand input data according to mode
  const inputFiles = {
    network: null,
    routes: null,
    sumoConfig: sumoConfigFile,
  }
  switch (config.mode) {
    case modes.osm:
      await prepareOSM(inputFiles, directories, config)
      break
    case modes.matsim:
      await prepareMATSim(inputFiles, directories, config)
      break
    default:
      break
  }

  // 2. Download air data and prepare air quality zone polygons
  logSection("Prepare Air Data")

  await prepareAirData(inputFiles, directories, config)

  console.log("\nDone!\n")

  // 3. Write SUMO config file
  logSection("Prepare SUMO Simulation")
  console.log("Writing SUMO config file...")
  writeSUMOConfig(inputFiles, directories, config)

  console.log("Done!\n")

  if (CLIOptions.prepare) {
    return
  }

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
