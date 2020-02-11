const commandLineArgs = require("command-line-args")

const runBash = require("./runBash")

const optionDefinitions = [
  { name: "input", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.input === undefined) {
  console.error("Error: You must supply an input path to an OSM file")
  process.exit(0)
}

if (options.output === undefined) {
  console.error("Error: You must supply an output path")
  process.exit(0)
}

runBash(`netconvert --osm-files ${options.input} -o ${options.output}`)
