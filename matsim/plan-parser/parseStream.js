const fs = require("fs")
const sax = require("sax")

let currentTag = ""
let currentPerson = ""
let personCounter = 0
let routeCounter = 0
let parsePlan = false
let parseRoute = false
let carInteractionX = 0
let carInteractionY = 0
let currentTrip = {
  id: "some id",
  depart: "time when vehicle departs",
  from: "edge from where the vehicle departs",
  fromCoordinates: {
    x: "x from coordinate in GK4",
    y: "y from coordinate in GK4",
  },
  to: "edge to where the vehicle drives",
  toCoordinates: {
    x: "x to coordinate in GK4",
    y: "y to coordinate in GK4",
  },
}

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
    console.log(`New person: ${currentPerson}`)
  }

  if (currentTag === "plan") {
    parsePlan = node.attributes.selected === "yes"
  }

  if (currentTag === "activity") {
    carInteractionX = parseFloat(node.attributes.x)
    carInteractionY = parseFloat(node.attributes.y)

    if (parseRoute && parsePlan) {
      currentTrip.toCoordinates = {
        x: carInteractionX,
        y: carInteractionY,
      }
    }
  }

  if (currentTag === "leg" && parsePlan) {
    if (node.attributes.mode === "car") {
      // console.log(node)
      parseRoute = true
      routeCounter++
    }
  }

  if (currentTag === "route" && parseRoute && parsePlan) {
    currentTrip = {
      id: `${currentPerson}_${routeCounter}`,
      depart: `${personCounter * 100 + routeCounter}`,
      from: node.attributes.start_link,
      fromCoordinates: {
        x: carInteractionX,
        y: carInteractionY,
      },
      to: node.attributes.end_link,
    }
  }

  // console.log(node)
}

async function onCloseTag(tagName) {
  if (tagName === "person") {
    console.log(`Person ${currentPerson} done`)
    routeCounter = 0
  }

  if (tagName === "plan") {
    parsePlan = false
  }

  if (tagName === "activity" && parseRoute && parsePlan) {
    this.planWriter.writeTrip(currentTrip)
    parseRoute = false
  }
}

function onText(text) {
  // if (currentTag === "route" && parseRoute) {
  //   if (outputType === "routes") {
  //     const xml = xmlBuilder
  //       .begin()
  //       .element("vehicle", {
  //         id: `${currentPerson.id}_${routeCounter}`,
  //         color: currentPerson.color,
  //         depart: `${personCounter * 100 + routeCounter}`,
  //       })
  //       .element("route", {
  //         edges: text,
  //       })
  //       .end({ pretty: true })
  //     // console.log(text)
  //     outputStream.write(`${xml}\n`)
  //   }
  // }
}

function onEnd() {
  this.planWriter.finish()
  console.log("Parsing done!")
}

function parseStream() {
  const saxStream = sax.createStream(true)
  saxStream.on("error", onError.bind(this))
  saxStream.on("opentag", onOpenTag.bind(this))
  saxStream.on("closetag", onCloseTag.bind(this))
  saxStream.on("text", onText.bind(this))
  saxStream.on("end", onEnd.bind(this))

  this.planWriter.start()
  fs.createReadStream(this.path).pipe(saxStream)
}

module.exports = parseStream
