const downloadMATSimNetwork = require("../matsim/downloadMATSimNetwork")
const downloadMATSimPlans = require("../matsim/downloadMATSimPlans")
const convertMATSimNetwork = require("../sumo/convertMATSimNetwork")

const run = async () => {
  const networkFile = await downloadMATSimNetwork({
    verbose: true,
  })
  await convertMATSimNetwork({
    verbose: true,
    network: networkFile,
  })

  await downloadMATSimPlans({
    verbose: true,
    scenario: "1pct",
  })
  await downloadMATSimPlans({
    verbose: true,
    scenario: "10pct",
  })
}

run()
