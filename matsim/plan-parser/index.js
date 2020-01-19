const path = require("path")

const PlanParser = require("./PlanParser")

const inputDataPath = path.join(__dirname, "..", "plan-input", "test-pop.xml")

const outputTypes = {
  TRIPS: "trips",
  ROUTES: "routes",
}

const outputType = outputTypes.TRIPS

const getOutputFilename = () => {
  switch (outputType) {
    case "trips":
      return "matsim-plans.trips.xml"
    case "routes":
      return "matsim-plans.rou.xml"
    default:
      return "matsim-plans.trips.xml"
  }
}
const outputFilename = getOutputFilename()
const outputDataPath = path.join(__dirname, "..", "..", "sumo", outputFilename)

const planParser = new PlanParser({
  path: inputDataPath,
  outputPath: outputDataPath,
  outputType,
})
// planParser.parseSync()
planParser.parseStream()
