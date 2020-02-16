const { runBash, validateOptions } = require("../shared/helpers")
const parseCLIOptions = require("../shared/parseCLIOptions")

const optionDefinitions = [
  { name: "input", type: String, description: "Filepath to OSM network file", required: true },
  { name: "output", type: String, description: "Filepath to output XML file", required: true },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function convertOSMNetwork(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  await runBash(`netconvert --osm-files ${options.input} -o ${options.output}`)
}

if (CLIOptions.run) {
  convertOSMNetwork()
}

module.exports = convertOSMNetwork
