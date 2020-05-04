const { basename } = require("path")
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

  const logFile = options.output.replace(basename(options.output), "netconvert-logs.txt")

  await runBash([
    "netconvert",
    `--osm-files ${options.input}`,
    `--output-file ${options.output}`,
    "--verbose",
    `--log ${logFile}`,
    // Recommended OSM conversion options
    "--geometry.remove",
    "--ramps.guess",
    "--junctions.join",
    "--tls.guess-signals",
    "--tls.discard-simple",
    "--tls.join",
    "--tls.default-type actuated",
    // DLR used this one in their simulation
    // http://sumo-user-mailing-list.90755.n8.nabble.com/sumo-user-Error-The-vehicle-type-type1-for-vehicle-veh0-is-not-known-tp3376p3390.html
    "--no-internal-links true",
  ])
}

if (CLIOptions.run) {
  convertOSMNetwork()
}

module.exports = convertOSMNetwork
