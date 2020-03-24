const fs = require("fs")
const { join } = require("path")
const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash, validateOptions } = require("../shared/helpers")

const optionDefinitions = [
  { name: "network", type: String, description: "Filepath to the MATSim network", required: true },
  {
    name: "output",
    type: String,
    description: "Filepath for the converted MATSim network",
    defaultValue: join(__dirname, "..", "matsim", "network", "berlin-v5-network-converted.net.xml"),
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

async function convertMATSimNetwork(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  if (!fs.existsSync(options.output)) {
    console.log("Converting MATSim network to the SUMO format...")
    await runBash([
      "netconvert",
      `--matsim ${options.network}`,
      `--output-file ${options.output}`,
      "--matsim.lanes-from-capacity=true --matsim.keep-length=true",
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
