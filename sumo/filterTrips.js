const fs = require("fs")
const { join } = require("path")
const sax = require("sax")
const XMLBuilder = require("xmlbuilder")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions } = require("../shared/helpers")

const optionDefinitions = [
  {
    name: "scenario",
    type: String,
    description:
      "The scenario that should be loaded \n (Possible values: 1pct, 10pct, default: 1pct)",
    defaultValue: "1pct",
    possibleValues: ["1pct", "10pct"],
  },
  {
    name: "output",
    type: String,
    defaultValue: join(__dirname, "trips.xml"),
    description: "Filepath for the output XML file",
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "south,west,north,east",
    description: "Only parse car rides within this bbox",
    required: true,
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

let totalTripCounter = 0
let filteredTripCounter = 0
const tripsXML = XMLBuilder.create("trips")

function onError(err) {
  console.error(err)
}

function onOpenTag(node, options) {
  const currentTag = node.name
  if (currentTag === "trip") {
    totalTripCounter++
    const currentTrip = node.attributes
    const { fromLonLat, toLonLat } = currentTrip
    const [fromLong, fromLat] = fromLonLat.split(",").map(parseFloat)
    const [toLong, toLat] = toLonLat.split(",").map(parseFloat)
    const [south, west, north, east] = options.bbox
    if (
      fromLat < south ||
      fromLat > north ||
      fromLong < west ||
      fromLong > east ||
      toLat < south ||
      toLat > north ||
      toLong < west ||
      toLong > east
    ) {
      // trip is out of bounds
      filteredTripCounter++
      return
    }

    // Filter all trips that start after 24h
    const tripDepartLimit = 24 * 60 * 60
    if (currentTrip.depart > tripDepartLimit) {
      filteredTripCounter++
      return
    }

    // currentTrip.depart = (totalTripCounter - filteredTripCounter) * 60

    tripsXML.element("trip", currentTrip)
  }
}

async function filterTrips(callerOptions) {
  return new Promise((resolve, reject) => {
    const options = { ...CLIOptions, ...callerOptions }

    validateOptions(options, optionDefinitions)

    const saxStream = sax.createStream(true)
    saxStream.on("error", onError)
    saxStream.on("opentag", node => onOpenTag(node, options))
    saxStream.on("end", () => {
      console.log("Total trips: ", totalTripCounter)
      console.log("Filtered trips: ", filteredTripCounter)
      console.log("Output trips: ", totalTripCounter - filteredTripCounter)
      fs.writeFileSync(options.output, tripsXML.end({ pretty: true }))
      resolve()
    })

    const tripsFile = join(
      __dirname,
      "..",
      "matsim",
      "plans",
      `berlin-v5.4-${options.scenario}.output_plans.trips.xml`
    )
    fs.createReadStream(tripsFile).pipe(saxStream)
  })
}

if (CLIOptions.run) {
  filterTrips()
}

module.exports = filterTrips
