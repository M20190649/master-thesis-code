const fs = require("fs")
const { join } = require("path")
const sax = require("sax")
const gk = require("gauss-krueger")
const XMLBuilder = require("xmlbuilder")
const commandLineArgs = require("command-line-args")

const db = require("../db/matsim/index")

const outputModes = {
  geo: "GEO",
  matsim: "MATSIM",
}

const optionDefinitions = [
  {
    name: "plans",
    type: String,
    defaultValue: join(__dirname, "plans", "test-pop.xml"),
    // defaultValue: join(__dirname, "plans", "berlin-v5.4-1pct.output_plans.xml"),
  },
  {
    name: "output",
    type: String,
    defaultValue: join(__dirname, "..", "sumo", "matsim-trips.xml"),
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
  },
  {
    name: "mode",
    type: String,
    defaultValue: "geo",
  },
  {
    name: "verbose",
    alias: "v",
    type: Boolean,
    defaultValue: false,
  },
]

const options = commandLineArgs(optionDefinitions)

if (outputModes[options.mode] === undefined) {
  throw new Error(`Unknown mode: "${options.mode}"`)
} else {
  options.mode = outputModes[options.mode]
}

let currentTag = ""
let currentPerson = ""
let personCounter = 0
let routeCounter = 0
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

const log = (x, isImportant) => {
  if (options.verbose || isImportant) {
    console.log(x)
  }
}

const tripsXML = XMLBuilder.create("trips")

function onError(err) {
  console.error(err)
}

function onOpenTag(node) {
  currentTag = node.name
  if (currentTag === "person") {
    currentPerson = node.attributes.id

    // const randomR = Math.floor(Math.random() * 256)
    // const randomG = Math.floor(Math.random() * 256)
    // const randomB = Math.floor(Math.random() * 256)
    // currentPerson.color = `${randomR},${randomG},${randomB}`

    personCounter++
    log(`New person: ${currentPerson}`)
  }

  if (currentTag === "plan") {
    parsePlan = node.attributes.selected === "yes"
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
    }
  }

  if (currentTag === "leg" && parsePlan) {
    if (node.attributes.mode === "car") {
      if (node.attributes.dep_time === undefined) {
        log(`Warning: Skipping person ${currentPerson} because departure times are missing`, true)
        parsePlan = false
        return
      }
      const [hour, minute, second] = node.attributes.dep_time.split(":").map(parseFloat)
      currentTrip.depart = hour * 60 * 60 + minute * 60 + second
      parseRoute = true
      routeCounter++
    }
  }

  if (currentTag === "route" && parseRoute && parsePlan) {
    const GK4coordinates = { x: carInteractionX, y: carInteractionY }
    const WGS84Coordinates = gk.toWGS(GK4coordinates)
    currentTrip.id = `${currentPerson}_${routeCounter}`
    currentTrip.from = node.attributes.start_link
    currentTrip.to = node.attributes.end_link
    currentTrip.fromCoordinates = {
      ...GK4coordinates,
      ...WGS84Coordinates,
    }
  }

  // log(node)
}

function onCloseTag(tagName) {
  if (tagName === "person") {
    log(`Person ${currentPerson} done`)
    routeCounter = 0
  }

  if (tagName === "plan") {
    parsePlan = false
  }

  if (tagName === "activity" && parseRoute && parsePlan) {
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
    log(`Adding trip ${currentTrip.id}`)
    const attributes = {
      id: currentTrip.id,
      depart: currentTrip.depart,
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
    parseRoute = false
  }
}

function onEnd() {
  fs.writeFileSync(options.output, tripsXML.end({ pretty: true }))
  log("Parsing done!")
}

const saxStream = sax.createStream(true)
saxStream.on("error", onError)
saxStream.on("opentag", onOpenTag)
saxStream.on("closetag", onCloseTag)
saxStream.on("end", onEnd)

fs.createReadStream(options.plans).pipe(saxStream)
