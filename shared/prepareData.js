const fs = require("fs")

const downloadMATSimNetwork = require("../matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../matsim/downloadMATSimPlans")
const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")
const convertPlansToTrips = require("../sumo/convertPlansToTrips")

const run = async () => {
  const networkFile = await downloadMATSimNetwork()

  console.log()

  await convertMATSimNetwork({
    network: networkFile,
  })

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
