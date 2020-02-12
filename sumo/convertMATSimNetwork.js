const commandLineArgs = require("command-line-args")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [
  { name: "input", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.input === undefined) {
  throw new Error("Error: You must supply an input path to a MATSim network file")
}

runBash([
  "netconvert",
  `--matsim ${options.input}`,
  `--output-file ${options.output || "converted-matsim-network.net.xml"}`,
  "--matsim.lanes-from-capacity=true --matsim.keep-length=true",
])
