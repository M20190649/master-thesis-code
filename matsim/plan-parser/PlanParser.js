const parseStream = require("./parseStream")
const PlanWriter = require("./PlanWriter")

const defaultOptions = {
  path: "",
  outputPath: __dirname,
  outputType: "trips",
}

function PlanParser(options = defaultOptions) {
  this.path = options.path || defaultOptions.path
  this.outputPath = options.outputPath || defaultOptions.outputPath

  this.start = parseStream
  this.planWriter = new PlanWriter(this.outputPath)
}

module.exports = PlanParser
