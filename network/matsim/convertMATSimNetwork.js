const fs = require("fs")
const { basename } = require("path")
const parseCLIOptions = require("../../shared/parseCLIOptions")
const { runBash, validateOptions } = require("../../shared/helpers")

const optionDefinitions = [
  {
    name: "network",
    type: String,
    description: "Filepath to the MATSim network",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath for the converted MATSim network",
    required: true,
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

async function convertMATSimNetwork(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const logFile = options.output.replace(
    basename(options.output),
    "netconvert-logs.txt"
  )

  if (!fs.existsSync(options.output)) {
    console.log("Converting MATSim network to the SUMO format...")
    await runBash([
      "netconvert",
      `--matsim ${options.network}`,
      `--output-file ${options.output}`,
      `--log ${logFile}`,
      "--verbose",
      "--matsim.lanes-from-capacity=true --matsim.keep-length=true",
      "--proj.dhdnutm", // Convert DHDN to UTM coordinate reference system
      // DLR used this one in their simulation
      // http://sumo-user-mailing-list.90755.n8.nabble.com/sumo-user-Error-The-vehicle-type-type1-for-vehicle-veh0-is-not-known-tp3376p3390.html
      // https://sumo.dlr.de/docs/Networks/Import/OpenStreetMap.html#importing_large_networks
      "--no-internal-links true",
    ])
    console.log("Done!")
  } else {
    console.log("Converted MATSim network already exists")
  }

  return options.output
}

if (CLIOptions.run) {
  convertMATSimNetwork()
}

module.exports = convertMATSimNetwork
