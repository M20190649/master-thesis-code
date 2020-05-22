const fs = require("fs")

const downloadMATSimNetwork = require("../network/matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../demand/downloadMATSimPlans")
const convertPlansToTrips = require("../demand/convertPlansToTrips")

const run = async () => {
  await downloadMATSimNetwork()

  console.log()

  const scenarios = ["1pct", "10pct"]

  for (const s of scenarios) {
    const plansFile = await downloadMATSimPlans({
      scenario: s,
    })

    console.log()

    const tripsFile = plansFile.replace(".xml", ".trips.xml")

    console.log(`Convert MATSim ${s} plans to SUMO trips...`)
    if (fs.existsSync(tripsFile)) {
      console.log(`${s} trips file already exists`)
    } else {
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
