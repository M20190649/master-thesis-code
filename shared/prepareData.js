const downloadMATSimNetwork = require("../matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../matsim/downloadMATSimPlans")
const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")

const run = async () => {
  const networkFile = await downloadMATSimNetwork()

  await convertMATSimNetwork({
    network: networkFile,
  })

  await downloadMATSimPlans({
    scenario: "1pct",
  })

  await downloadMATSimPlans({
    scenario: "10pct",
  })
}

run()
