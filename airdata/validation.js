const { runBash } = require("../shared/helpers")
const getAirData = require("./getAirData")

async function validate() {
  const bbox = [52.46165771962076, 13.278694152832031, 52.5417022642097, 13.485031127929688]
  const dates = ["01.02.2020", "13.02.2020", "19.02.2020", "03.03.2020"]
  const directory = "validation2"

  const allFiles = []
  for (const date of dates) {
    const options = {
      pollutant: "PM10",
      bbox,
      date,
      timestep: 60,
      output: directory,
    }
    const files = await getAirData(options)
    allFiles.push(...files)
  }

  await runBash(`python validation.py --directory=${directory}`)
}

async function test() {
  const options = {
    pollutant: "PM10",
    bbox: [52.46165771962076, 13.278694152832031, 52.5417022642097, 13.485031127929688],
    date: "20.02.2020",
    timestep: 60,
    output: "validation-20-02-2020",
  }
  const filenames = await getAirData(options)

  console.log(filenames)

  return

  // const methods = ["nearest_neighbor", "discrete_natural_neighbor", "idw", "linear_barycentric"]
  const methods = ["idw"]

  for (const method of methods) {
    for (const file of filenames) {
      const dirName = `${options.output}/${method}`
      await runBash(
        `python interpolate.py --measurements=${file} --method=${method} --output=${dirName} --visualize=true`
      )
    }
  }
}

// test()
validate()
