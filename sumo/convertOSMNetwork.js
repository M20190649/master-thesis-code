const commandLineArgs = require("command-line-args")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [
  { name: "input", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.input === undefined) {
  throw new Error("You must supply an input path to an OSM file")
}

if (options.output === undefined) {
  throw new Error("You must supply an output path")
}

runBash(`netconvert --osm-files ${options.input} -o ${options.output}`)
