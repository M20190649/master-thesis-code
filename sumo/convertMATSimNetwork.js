const commandLineArgs = require("command-line-args")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [
  { name: "network", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.network === undefined) {
  throw new Error("You must supply an input path to a MATSim network file")
}

runBash([
  "netconvert",
  `--matsim ${options.network}`,
  `--output-file ${options.output || "converted-matsim-network.net.xml"}`,
  "--matsim.lanes-from-capacity=true --matsim.keep-length=true",
])
