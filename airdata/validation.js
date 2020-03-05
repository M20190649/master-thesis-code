const { pad, runBash } = require("../shared/helpers")
const getAirData = require("./getAirData")

async function run() {
  const filenames = []

  for (let i = 0; i < 24; i++) {
    const filename = await getAirData({
      pollutant: "PM10",
      bbox: "52.25639,12.874603,52.778678,13.932037".split(",").map(Number),
      datetime: new Date(`2020-02-20T${pad(i)}:00:00.000Z`),
      output: "test",
    })
    filenames.push(filename)
  }

  const methods = ["nearest_neighbor", "natural_neighbor", "idw", "linear_barycentric"]

  for (const method of methods) {
    for (const file of filenames) {
      const dirName = `test/${method}`
      await runBash(
        `python interpolate.py --measurements=${file} --method=${method} --output=${dirName} --visualize=true`
      )
    }
  }
}

run()
