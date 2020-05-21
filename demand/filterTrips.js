const fs = require("fs")
const { join } = require("path")
const sax = require("sax")
const XMLBuilder = require("xmlbuilder")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions } = require("../shared/helpers")

const { getAllEmissionClasses, getEmissionClass } = require("./emissions")

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
const emissionClassPerPerson = {}

const tripsXML = XMLBuilder.create("trips")

// Add vehicle types with all supported emission types to begining of trips file
// Assign vTypes to individual persons according to official distribution later during parsing process
const vTypeIdTemplate = "type-{emissionClass}"
getAllEmissionClasses().forEach(ec => {
  tripsXML.element("vType", {
    id: vTypeIdTemplate.replace("{emissionClass}", ec),
    emissionClass: `HBEFA3/${ec}`,
  })
})

function onError(err) {
  console.error(err)
}

function onOpenTag(node, options) {
  const currentTag = node.name
  if (currentTag === "trip") {
    totalTripCounter += 1
    const currentTrip = node.attributes
    const { id, fromLonLat, toLonLat } = currentTrip
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
      filteredTripCounter += 1
      return
    }

    // Filter all trips that start after 24h
    const tripDepartLimit = 24 * 60 * 60
    if (currentTrip.depart > tripDepartLimit) {
      filteredTripCounter += 1
      return
    }

    // Add emission class according to distribution
    // We must assign emission type PER PERSON and NOT PER TRIP
    const [person, counter] = id.split("_")

    let ec = ""
    if (emissionClassPerPerson[person]) {
      ec = emissionClassPerPerson[person]
    } else {
      ec = getEmissionClass()
      emissionClassPerPerson[person] = ec
    }

    currentTrip.type = vTypeIdTemplate.replace("{emissionClass}", ec)

    // Do some modifications if necessary
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
