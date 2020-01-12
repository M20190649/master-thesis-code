const parseSync = require("./parseSync")
const parseStream = require("./parseStream")

function PlanParser(path, outputPath = __dirname) {
  this.path = path
  this.outputPath = outputPath

  this.parseSync = parseSync
  this.parseStream = parseStream
}

module.exports = PlanParser
