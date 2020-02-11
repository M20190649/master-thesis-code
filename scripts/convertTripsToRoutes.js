const commandLineArgs = require("command-line-args")

const runBash = require("./runBash")

const optionDefinitions = [
  { name: "trips", alias: "t", type: String },
  { name: "network", alias: "n", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

for (const option of optionDefinitions) {
  if (options[option.name] === undefined) {
    console.error(`Error: You must supply the "${option.name}" option`)
    process.exit(0)
  }
}

runBash(
  `duarouter -v --route-files ${options.trips} --net-file ${options.network} --output-file ${options.output}`
)
