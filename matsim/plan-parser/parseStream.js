const fs = require("fs")
const sax = require("sax")
const xmlBuilder = require("xmlbuilder")

function onError(err) {
  console.error(err)
}

function onOpenTag(node) {
  this.currentTag = node.name
  if (this.currentTag === "person") {
    this.currentPerson.id = node.attributes.id

    const randomR = Math.floor(Math.random() * 256)
    const randomG = Math.floor(Math.random() * 256)
    const randomB = Math.floor(Math.random() * 256)
    this.currentPerson.color = `${randomR},${randomG},${randomB}`

    this.personCounter++
    console.log(`New person: ${this.currentPerson.id}`)
  }

  if (this.currentTag === "plan") {
    this.parsePlan = node.attributes.selected === "yes"
  }

  if (this.currentTag === "activity") {
    this.carInteractionX = node.attributes.x
    this.carInteractionY = node.attributes.y

    if (this.outputType === "trips" && this.parseRoute && this.parsePlan) {
      this.currentRoute.toCoordinates = {
        x: this.carInteractionX,
        y: this.carInteractionY,
      }
    }
  }

  if (this.currentTag === "leg" && this.parsePlan) {
    if (node.attributes.mode === "car") {
      // console.log(node)
      this.parseRoute = true
      this.routeCounter++
    }
  }

  if (this.currentTag === "route" && this.parseRoute && this.parsePlan) {
    if (this.outputType === "trips") {
      this.currentRoute = {
        id: `${this.currentPerson.id}_${this.routeCounter}`,
        depart: `${this.personCounter * 100 + this.routeCounter}`,
        from: node.attributes.start_link,
        fromCoordinates: {
          x: this.carInteractionX,
          y: this.carInteractionY,
        },
        to: node.attributes.end_link,
      }
    }
  }

  // console.log(node)
}

async function onCloseTag(tagName) {
  if (tagName === "person") {
    console.log(`Person ${this.currentPerson.id} done`)
    this.routeCounter = 0

    // if (this.personCounter === 1) {
    //   this.inputStream.end()
    // }
  }

  if (tagName === "plan") {
    this.parsePlan = false
  }

  if (tagName === "activity" && this.parseRoute && this.parsePlan) {
    // this.inputStream.pause()
    // const fromOSMEdge = await this.getOSMEdge(
    //   this.currentRoute.from,
    //   this.currentRoute.fromCoordinates
    // )
    // const toOSMEdge = await this.getOSMEdge(this.currentRoute.to, this.currentRoute.toCoordinates)

    // const xml = xmlBuilder
    //   .begin()
    //   .element("trip", {
    //     id: this.currentRoute.id,
    //     depart: this.currentRoute.depart,
    //     from: fromOSMEdge,
    //     to: toOSMEdge,
    //   })
    //   .end({ pretty: true })
    // this.outputStream.write(`${xml}\n`)

    console.log(this.currentRoute)

    this.parseRoute = false

    // this.inputStream.resume()
  }
}

function onText(text) {
  if (this.currentTag === "route" && this.parseRoute) {
    if (this.outputType === "routes") {
      const xml = xmlBuilder
        .begin()
        .element("vehicle", {
          id: `${this.currentPerson.id}_${this.routeCounter}`,
          color: this.currentPerson.color,
          depart: `${this.personCounter * 100 + this.routeCounter}`,
        })
        .element("route", {
          edges: text,
        })
        .end({ pretty: true })
      // console.log(text)
      this.outputStream.write(`${xml}\n`)
    }
  }
}

function onEnd() {
  this.outputStream.write(`</${this.outputType}>`)
  this.outputStream.end()
  console.log("Done!")
}

function parseStream() {
  this.currentTag = ""
  this.currentPerson = {
    id: -1,
    color: "0,0,0",
  }
  this.personCounter = 0
  this.routeCounter = 0
  this.parsePlan = false
  this.parseRoute = false
  this.carInteractionX = 0
  this.carInteractionY = 0
  this.currentRoute = {
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

  const parser = sax.parser(true)
  parser.onerror = onError.bind(this)
  parser.onopentag = onOpenTag.bind(this)
  parser.onclosetag = onCloseTag.bind(this)
  parser.ontext = onText.bind(this)
  parser.onend = onEnd.bind(this)

  this.outputStream = fs.createWriteStream(this.outputPath)
  this.outputStream.write(`<${this.outputType}>\n`)

  this.inputStream = fs.createReadStream(this.path)
  this.inputStream.setEncoding("utf8")
  this.inputStream.on("data", chunk => {
    // console.log(chunk)
    parser.write(chunk)
  })
}

module.exports = parseStream
