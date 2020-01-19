const parseSync = require("./parseSync")
const parseStream = require("./parseStream")

const defaultOptions = {
  path: "",
  outputPath: __dirname,
  outputType: "trips",
}

function PlanParser(options = defaultOptions) {
  this.path = options.path || defaultOptions.path
  this.outputPath = options.outputPath || defaultOptions.outputPath
  this.outputType = options.outputType || defaultOptions.outputType

  this.parseSync = parseSync
  this.parseStream = parseStream
}

module.exports = PlanParser
