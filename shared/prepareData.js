const downloadMATSimNetwork = require("../matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../matsim/downloadMATSimPlans")
const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")

const run = async () => {
  const networkFile = await downloadMATSimNetwork()

  console.log()

  await convertMATSimNetwork({
    network: networkFile,
  })

  console.log()

  await downloadMATSimPlans({
    scenario: "1pct",
  })

  console.log()

  await downloadMATSimPlans({
    scenario: "10pct",
  })
}

run()
