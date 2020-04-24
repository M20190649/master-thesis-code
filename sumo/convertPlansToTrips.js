const fs = require("fs")
const { join } = require("path")
const sax = require("sax")
const gk = require("gauss-krueger")
const XMLBuilder = require("xmlbuilder")
const LineByLineReader = require("line-by-line")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, getTimeString } = require("../shared/helpers")

const outputModes = {
  geo: "geo",
  matsim: "matsim",
}

const optionDefinitions = [
  {
    name: "plans",
    type: String,
    description: "Filepath of the MATSim plans file",
    required: true,
  },
  {
    name: "output",
    type: String,
    defaultValue: join(__dirname, "matsim-trips.xml"),
    description: "Filepath for the output XML file",
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "south,west,north,east",
    description: "Only parse car rides within this bbox",
  },
  {
    name: "mode",
    type: String,
    defaultValue: "geo",
    description:
      "Determines value of 'from' and 'to' attributes of the trips (default: 'geo') \n ('geo' uses lat/long, 'matsim' uses the MATSim link ids)",
    possibleValues: Object.values(outputModes),
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

let lineReader = null
let currentTag = ""
let currentPerson = ""
let personCounter = 0
let personTripCounter = 0
let totalTripCounter = 0
let parsePlan = false
let parseRoute = false
let carInteractionX = 0
let carInteractionY = 0
const currentTrip = {
  id: "some id",
  depart: "time when vehicle departs",
  from: "edge from where the vehicle departs",
  fromCoordinates: {
    x: "x from coordinate in GK4",
    y: "y from coordinate in GK4",
    latitude: "latitude from",
    longitude: "longitude from",
  },
  to: "edge to where the vehicle drives",
  toCoordinates: {
    x: "x to coordinate in GK4",
    y: "y to coordinate in GK4",
    latitude: "latitude to",
    longitude: "longitude to",
  },
}
let timeTracker = 0
const tripsXML = XMLBuilder.create("trips")

function onError(err) {
  console.error(err)
}

function onOpenTag(node, options) {
  currentTag = node.name
  if (currentTag === "person") {
    currentPerson = node.attributes.id

    // const randomR = Math.floor(Math.random() * 256)
    // const randomG = Math.floor(Math.random() * 256)
    // const randomB = Math.floor(Math.random() * 256)
    // currentPerson.color = `${randomR},${randomG},${randomB}`

    personCounter++
    timeTracker = 0
    // console.log(`New person: ${currentPerson}`)
  }

  if (currentTag === "plan") {
    parsePlan = node.attributes.selected === "yes"
  }

  if (parsePlan) {
    if (node.attributes.end_time) {
      const [hour, minute, second] = node.attributes.end_time.split(":").map(parseFloat)
      timeTracker = hour * 60 * 60 + minute * 60 + second
    }

    if (node.attributes.trav_time) {
      const [hour, minute, second] = node.attributes.trav_time.split(":").map(parseFloat)
      timeTracker += hour * 60 * 60 + minute * 60 + second
    }

    if (node.attributes.max_dur) {
      const [hour, minute, second] = node.attributes.max_dur.split(":").map(parseFloat)
      timeTracker += hour * 60 * 60 + minute * 60 + second
    }
  }

  if (currentTag === "activity") {
    carInteractionX = parseFloat(node.attributes.x)
    carInteractionY = parseFloat(node.attributes.y)

    if (parseRoute && parsePlan) {
      const GK4coordinates = { x: carInteractionX, y: carInteractionY }
      const WGS84Coordinates = gk.toWGS(GK4coordinates)
      currentTrip.toCoordinates = {
        ...GK4coordinates,
        ...WGS84Coordinates,
      }

      if (options.bbox) {
        const [south, west, north, east] = options.bbox
        if (
          currentTrip.fromCoordinates.latitude < south ||
          currentTrip.fromCoordinates.latitude > north ||
          currentTrip.fromCoordinates.longitude < west ||
          currentTrip.fromCoordinates.longitude > east ||
          currentTrip.toCoordinates.latitude < south ||
          currentTrip.toCoordinates.latitude > north ||
          currentTrip.toCoordinates.longitude < west ||
          currentTrip.toCoordinates.longitude > east
        ) {
          // trip is out of bounds
          parseRoute = false
          return
        }
      }
      // console.log(`Adding trip ${currentTrip.id}`)
      const attributes = {
        id: currentTrip.id,
        depart: currentTrip.depart,
        // depart: totalTripCounter * 60, // For testing purposes
      }

      if (options.mode === outputModes.geo) {
        attributes.fromLonLat = `${currentTrip.fromCoordinates.longitude},${currentTrip.fromCoordinates.latitude}`
        attributes.toLonLat = `${currentTrip.toCoordinates.longitude},${currentTrip.toCoordinates.latitude}`
      }

      if (options.mode === outputModes.matsim) {
        attributes.from = currentTrip.from
        attributes.to = currentTrip.to
      }

      tripsXML.element("trip", attributes)
      totalTripCounter++
      parseRoute = false
    }
  }

  if (currentTag === "leg" && parsePlan) {
    if (node.attributes.mode === "car") {
      if (node.attributes.dep_time === undefined) {
        const timeString = getTimeString(new Date(timeTracker * 1000), ":")
        console.log(
          `Warning: Person ${currentPerson} is missing departure times. Using time tracker value (${timeTracker}s = ${timeString}) instead.`
        )
        currentTrip.depart = timeTracker
      } else {
        const [hour, minute, second] = node.attributes.dep_time.split(":").map(parseFloat)
        currentTrip.depart = hour * 60 * 60 + minute * 60 + second
      }

      parseRoute = true
      personTripCounter++
    }
  }

  if (currentTag === "route" && parseRoute && parsePlan) {
    const GK4coordinates = { x: carInteractionX, y: carInteractionY }
    const WGS84Coordinates = gk.toWGS(GK4coordinates)
    currentTrip.id = `${currentPerson}_${personTripCounter}`
    currentTrip.from = node.attributes.start_link
    currentTrip.to = node.attributes.end_link
    currentTrip.fromCoordinates = {
      ...GK4coordinates,
      ...WGS84Coordinates,
    }
  }

  // console.log(node)
}

async function onCloseTag(tagName) {
  if (tagName === "person") {
    // console.log(`Person ${currentPerson} done`)
    personTripCounter = 0
  }

  if (tagName === "plan") {
    parsePlan = false
  }
}

async function convertPlans(callerOptions) {
  return new Promise((resolve, reject) => {
    const options = { ...CLIOptions, ...callerOptions }

    validateOptions(options, optionDefinitions)

    const parser = sax.parser(true)
    parser.onerror = onError
    parser.onopentag = node => onOpenTag(node, options)
    parser.onclosetag = onCloseTag

    lineReader = new LineByLineReader(options.plans)
    lineReader.on("line", line => {
      parser.write(line)
    })
    lineReader.on("end", () => {
      fs.writeFileSync(options.output, tripsXML.end({ pretty: true }))
      console.log(`Total number of agents: ${personCounter}`)
      console.log(`Total number of trips: ${totalTripCounter}`)
      // console.log("Parsing done!")
      resolve()
    })
  })
}

if (CLIOptions.run) {
  convertPlans()
}

module.exports = convertPlans
