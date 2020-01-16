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

  if (this.currentTag === "leg" && this.parsePlan) {
    if (node.attributes.mode === "car") {
      // console.log(node)
      this.parseRoute = true
      this.routeCounter++
    }
  }

  // if (this.currentTag === "route" && this.parsePlan) {
  //   console.log(node)
  // }

  // console.log(node)
}
function onCloseTag(tagName) {
  if (tagName === "person") {
    console.log(`Person ${this.currentPerson.id} done`)
    this.routeCounter = 0

    // if (this.personCounter === 1) {
    //   this.inputStream.end()
    // }
  }

  if (tagName === "route") {
    this.parseRoute = false
  }

  if (tagName === "plan") {
    this.parsePlan = false
  }
}

function onText(text) {
  if (this.currentTag === "route" && this.parseRoute) {
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

function onEnd() {
  this.outputStream.write("</routes>")
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

  const saxStream = sax.createStream(true)
  saxStream.on("error", onError.bind(this))
  saxStream.on("opentag", onOpenTag.bind(this))
  saxStream.on("closetag", onCloseTag.bind(this))
  saxStream.on("text", onText.bind(this))
  saxStream.on("end", onEnd.bind(this))

  this.inputStream = saxStream
  this.outputStream = fs.createWriteStream(this.outputPath)
  this.outputStream.write("<routes>\n")
  fs.createReadStream(this.path).pipe(saxStream)
}

module.exports = parseStream
