const path = require("path")

const PlanParser = require("./PlanParser")

const inputDataPath = path.join(__dirname, "..", "plans", "test-pop.xml")
const outputDataPath = path.join(__dirname, "..", "..", "sumo", "matsim-plans.trips.xml")

const planParser = new PlanParser({
  path: inputDataPath,
  outputPath: outputDataPath,
})

planParser.start()
