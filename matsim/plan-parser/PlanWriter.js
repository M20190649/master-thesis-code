const fs = require("fs")
const XMLBuilder = require("xmlbuilder")
const sax = require("sax")
const gk = require("gauss-krueger")
const axios = require("axios")

const linkMapping = {}
async function getOSMEdge(edge, GK4Coordinates) {
  if (linkMapping[edge]) {
    return linkMapping[edge]
  }

  const { latitude, longitude } = gk.toWGS(GK4Coordinates)
  const query = `(way(around:5,${latitude},${longitude})[highway~"motorway|trunk|primary|secondary|tertiary|residential|living_street|motorway_link|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|road|unclassified"];>;);out;`

  const res = await axios.get("https://lz4.overpass-api.de/api/interpreter", {
    params: {
      data: query,
    },
  })

  return new Promise((resolve, reject) => {
    const possibleWays = []

    const parser = sax.parser(true)
    parser.onopentag = function(node) {
      if (node.name === "way") {
        possibleWays.push(node.attributes.id)
      }
    }
    parser.onend = function() {
      const chosenWay = possibleWays[Math.floor(Math.random() * possibleWays.length)]
      linkMapping[edge] = chosenWay
      resolve(chosenWay)
    }
    parser.write(res.data).close()
  })
}

function PlanWriter(path) {
  this.path = path
  this.writeStream = fs.createWriteStream(this.path)
  this.tripQueue = []
  this.end = false

  this.start = function() {
    this.writeStream.write("<trips>\n")
    this.checkQueue()
  }

  this.finish = async function() {
    this.end = true

    console.log(this.tripQueue.length)
    for (const trip of this.tripQueue) {
      await this.write(trip)
    }
    this.writeStream.write("</trips>")
  }

  this.writeTrip = async function(trip) {
    this.tripQueue.push(trip)
  }

  this.write = async function(trip) {
    console.log(trip)
    const fromOSMEdge = await getOSMEdge(trip.from, trip.fromCoordinates)
    const toOSMEdge = await getOSMEdge(trip.to, trip.toCoordinates)

    const xml = XMLBuilder.begin()
      .element("trip", {
        id: trip.id,
        depart: trip.depart,
        from: fromOSMEdge,
        to: toOSMEdge,
        // from: trip.from,
        // to: trip.to,
      })
      .end({ pretty: true })
    this.writeStream.write(`${xml}\n`)
  }

  this.checkQueue = async function() {
    if (this.end) return

    const trip = this.tripQueue.shift()
    if (trip !== undefined) {
      await this.write(trip)
    }

    setTimeout(() => this.checkQueue(), 1)
  }
}

module.exports = PlanWriter
