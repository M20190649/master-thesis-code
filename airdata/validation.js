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
    bbox: [52.25639, 12.874603, 52.778678, 13.932037],
    date: "02.02.2020",
    timestep: 60,
    output: "validation-02-02-2020",
  }
  const filenames = await getAirData(options)

  console.log(filenames)

  const methods = [
    // "nearest-neighbor",
    // "natural-neighbor",
    "idw",
    // "linear-rbf",
    // "thin-plate-rbf",
    // "kriging",
  ]

  const zones = [0, 20, 35, 50, 100, 1000]

  for (const method of methods) {
    for (const file of filenames) {
      const dirName = `${options.output}/${method}`
      await runBash([
        "python interpolate.py",
        `--measurements=${file}`,
        `--method=${method}`,
        `--output=${dirName}`,
        `--zones=${zones.join(",")}`,
        "--visualize=true",
      ])
    }
  }
}

async function download() {
  const dates = [
    // 2nd week of June 2019
    "10.06.2019",
    "11.06.2019",
    "12.06.2019",
    "13.06.2019",
    "14.06.2019",
    "15.06.2019",
    "16.06.2019",
    // 2nd week of August 2019
    "05.08.2019",
    "06.08.2019",
    "07.08.2019",
    "08.08.2019",
    "09.08.2019",
    "10.08.2019",
    "11.08.2019",
    // 2nd week of February 2020
    "10.02.2020",
    "11.02.2020",
    "12.02.2020",
    "13.02.2020",
    "14.02.2020",
    "15.02.2020",
    "16.02.2020",
    // 2nd week of March 2020
    "09.03.2020",
    "10.03.2020",
    "11.03.2020",
    "12.03.2020",
    "13.03.2020",
    "14.03.2020",
    "15.03.2020",
    // 2nd week of April 2020
    "06.04.2020",
    "07.04.2020",
    "08.04.2020",
    "09.04.2020",
    "10.04.2020",
    "11.04.2020",
    "12.04.2020",
  ]

  for (const date of dates) {
    const options = {
      pollutant: "PM10",
      bbox: [52.25639, 12.874603, 52.778678, 13.932037],
      date,
      timestep: 60,
      output: date,
    }
    const files = await getAirData(options)
  }
}

test()
// validate()
// download()
