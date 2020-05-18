const { basename } = require("path")
const { runBash, validateOptions } = require("../shared/helpers")
const parseCLIOptions = require("../shared/parseCLIOptions")

const optionDefinitions = [
  {
    name: "trips",
    type: String,
    description: "Filepath to the trip XML file",
    required: true,
  },
  {
    name: "network",
    type: String,
    description: "Filepath to the network XML file",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath for the output routes file XML file",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function convertTripsToRoutes(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const logFile = options.output.replace(
    basename(options.output),
    "duarouter-logs.txt"
  )

  await runBash([
    "duarouter",
    "--verbose",
    `--route-files ${options.trips}`,
    `--net-file ${options.network}`,
    `--output-file ${options.output}`,
    "--mapmatch.distance 1000",
    "--human-readable-time",
    "--unsorted-input",
    "--no-internal-links",
    "--repair",
    `--log ${logFile}`,
    "--ignore-errors",
  ])
}

if (CLIOptions.run) {
  convertTripsToRoutes()
}

module.exports = convertTripsToRoutes
