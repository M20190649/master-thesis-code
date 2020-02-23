const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions } = require("../shared/helpers")
const downloadLuftdatenInfo = require("./downloadLuftdatenInfo")
const downloadOpenSenseMap = require("./downloadOpenSenseMap")

const optionDefinitions = [
  {
    name: "pollutant",
    type: String,
    description: "Name of the pollutant to fetch",
    possibleValues: ["PM10", "PM2.5"],
    required: true,
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "CSV",
    description:
      "Bbox string (south,west,north,east) describing the boundaries which will be downloaded",
    required: true,
  },
  {
    name: "datetime",
    type: ISOString => new Date(ISOString),
    description: "Filepath for the measurements GeoJSON file",
    required: true,
  },
  {
    name: "output",
    type: String,
    description: "Filepath for the measurements GeoJSON file",
    required: true,
  },
]
const CLIOptions = parseCLIOptions(optionDefinitions)

async function getAirData(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const measurentsGeoJSON = await downloadOpenSenseMap(options)
  // console.log(measurentsGeoJSON)
}

if (CLIOptions.run) {
  getAirData()
}

module.exports = getAirData
