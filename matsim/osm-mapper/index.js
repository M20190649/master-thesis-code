const fs = require("fs")
const sax = require("sax")
const axios = require("axios")
const gk = require("gauss-krueger")
const { default: PQueue } = require("p-queue")

const pqueue = new PQueue({ concurrency: 1 })

const addToPQueue = async (asyncFn, cb) => {
  await pqueue.add(asyncFn)
  cb()
}

const db = require("../../db/matsim")

const N_NORMAL_NODES = 73689
const N_NORMAL_EDGES = 159039

let nNodes = 0
let nEdges = 0

const edgeMapping = {}

let timestamp = new Date().getTime()

async function getPossibleWays(overpassXML) {
  return new Promise((resolve, reject) => {
    const possibleWays = []
    const parser = sax.parser(true)
    parser.onopentag = node => {
      if (node.name === "way") {
        possibleWays.push(node.attributes.id)
      }
    }
    parser.onend = () => resolve(possibleWays)
    parser.write(overpassXML).close()
  })
}

async function sleep(duration) {
  console.log(`Sleeping ${duration}ms...`)
  return new Promise(resolve => setTimeout(resolve, duration))
}

async function getOSMEdge(edge) {
  const fromNode = nodes[edge.from]
  const toNode = nodes[edge.to]

  if (fromNode.WGS84Coordinates === undefined) {
    fromNode.WGS84Coordinates = gk.toWGS(fromNode.GK4Coordinates)
  }

  if (toNode.WGS84Coordinates === undefined) {
    toNode.WGS84Coordinates = gk.toWGS(toNode.GK4Coordinates)
  }

  const getQuery = (latitude, longitude) =>
    `(way(around:5,${latitude},${longitude})[highway~"motorway|trunk|primary|secondary|tertiary|residential|living_street|motorway_link|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|road|unclassified"];>;);out;`

  const fromWays = await axios
    .get("https://lz4.overpass-api.de/api/interpreter", {
      params: {
        data: getQuery(fromNode.WGS84Coordinates.latitude, fromNode.WGS84Coordinates.longitude),
      },
    })
    .then(res => getPossibleWays(res.data))

  await sleep(2000)

  const toWays = await axios
    .get("https://lz4.overpass-api.de/api/interpreter", {
      params: {
        data: getQuery(toNode.WGS84Coordinates.latitude, toNode.WGS84Coordinates.longitude),
      },
    })
    .then(res => getPossibleWays(res.data))

  const mergedSetLength = new Set(fromWays.concat(toWays)).size
  const nDuplicates = fromWays.length + toWays.length - mergedSetLength
  if (nDuplicates === 0) {
    console.log(`Warning: No OSM edge found for ${edge.id}`)
  }

  if (nDuplicates > 1) {
    console.log(`Warning: No unique OSM edge found for ${edge.id}`)
    console.log(fromWays, toWays)
  }

  const OSMEdge = fromWays.find(w => toWays.includes(w))

  await sleep(2000)

  return OSMEdge
}

async function processNetwork() {
  for (const edge of Object.values(edges)) {
    const OSMEdge = await getOSMEdge(edge)
    edgeMapping[edge.id] = OSMEdge

    console.log(`MATSim Edge ${edge.id} -> OSM Edge ${OSMEdge}`)
  }

  console.log(edgeMapping)
}

const saxStream = sax.createStream(true)

saxStream.on("opentag", node => {
  if (node.name === "node") {
    const { id, x, y } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport nodes

    nNodes++

    addToPQueue(
      () => db.createMATSimNode(id, x, y),
      () => console.log(`Stored node ${id}`)
    )
    return
  }

  if (node.name === "link") {
    const { id, from, to } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport edges
    nEdges++
    addToPQueue(
      () => db.createMATSimLink(id, from, to),
      () => console.log(`Stored edge ${id}`)
    )
  }
})

saxStream.on("end", () => {
  const lastTimestamp = timestamp
  timestamp = new Date().getTime()
  console.log(`Done! (${timestamp - lastTimestamp}ms)`)
  console.log(`Total Nodes: ${nNodes}`)
  console.log(`Total Edges: ${nEdges}`)
  // processNetwork()
})

async function start() {
  await db.init()
  timestamp = new Date().getTime()
  console.log("Parsing MATSim network...")
  fs.createReadStream("../network/berlin-v5-network.xml").pipe(saxStream)
}

start()
