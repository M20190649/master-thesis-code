const { runBash } = require("../shared/helpers")
const getAirData = require("./getAirData")

async function run() {
  const options = {
    pollutant: "PM10",
    bbox: "52.25639,12.874603,52.778678,13.932037".split(",").map(Number),
    from: new Date(`2020-03-02T00:00:00.000Z`),
    to: new Date(`2020-03-02T23:59:00.000Z`),
    timestep: 60,
    output: "meeting",
  }
  const filenames = await getAirData(options)

  console.log(filenames)

  const methods = [
    "nearest_neighbor",
    "discrete_natural_neighbor",
    "idw",
    "linear_barycentric",
    "clough_tocher",
  ]

  for (const method of methods) {
    for (const file of filenames) {
      const dirName = `${options.output}/${method}`
      await runBash(
        `python interpolate.py --measurements=${file} --method=${method} --output=${dirName} --visualize=true`
      )
    }
  }
}

run()
