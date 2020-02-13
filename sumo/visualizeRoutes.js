const { join } = require("path")
const commandLineArgs = require("command-line-args")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [
  { name: "network", type: String },
  { name: "routes", type: String },
  { name: "output", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.network === undefined) {
  throw new Error("You must supply a path to a SUMO network file")
}

if (options.routes === undefined) {
  throw new Error("You must supply a path to a SUMO routes file")
}

if (options.output === undefined) {
  throw new Error("You must supply a path to a file where the output XML should be stored")
}

runBash([
  "py",
  join(process.env.SUMO_HOME, "tools", "route", "route2poly.py"),
  options.network,
  options.routes,
  `--outfile=${options.output}`,
])
