const { join } = require("path")
const { runBash, validateOptions } = require("../shared/helpers")
const parseCLIOptions = require("../shared/parseCLIOptions")

const optionDefinitions = [
  {
    name: "routes",
    type: String,
    description: "Filepath to the routes XML file",
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
    description: "Filepath for the output routes visualization XML file",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function visualizeRoutes(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  await runBash([
    "python",
    join(process.env.SUMO_HOME, "tools", "route", "route2poly.py"),
    options.network,
    options.routes,
    `--outfile=${options.output}`,
  ])
}

if (CLIOptions.run) {
  visualizeRoutes()
}

module.exports = visualizeRoutes
