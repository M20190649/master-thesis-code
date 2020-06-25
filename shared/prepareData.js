const { join } = require("path")
const glob = require("glob")

const downloadMATSimNetwork = require("../network/matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../demand/downloadMATSimPlans")
const convertPlansToTrips = require("../demand/convertPlansToTrips")

const run = async () => {
  await downloadMATSimNetwork()

  console.log()

  const scenarios = ["1pct", "10pct"]
  const plansDir = join(__dirname, "..", "demand", "plans")

  for (const s of scenarios) {
    const tripFileSearchPattern = `*${s}*trips.xml`
    const searchPattern = join(plansDir, tripFileSearchPattern)
    const [tripsFile] = glob.sync(searchPattern)

    console.log(`Checking for ${s} trips file...`)
    if (tripsFile) {
      console.log(`${s} trips file already exists\n`)
    } else {
      console.log(`Convert MATSim ${s} plans to SUMO trips...`)
      const plansFile = await downloadMATSimPlans({
        scenario: s,
      })

      const tripsFile = plansFile.replace(".xml", ".trips.xml")

      console.log()

      await convertPlansToTrips({
        plans: plansFile,
        mode: "geo",
        output: tripsFile,
      })
      console.log("Done!\n")
    }
  }
}

run()
