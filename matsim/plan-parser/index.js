const path = require("path")

const PlanParser = require("./PlanParser")

const inputDataPath = path.join(__dirname, "..", "plan-input", "test-pop.xml")
const outputDataPath = path.join(__dirname, "..", "..", "sumo", "matsim-plans.rou.xml")

const planParser = new PlanParser(inputDataPath, outputDataPath)
// planParser.parseSync()
planParser.parseStream()
