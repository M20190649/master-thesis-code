const fs = require("fs")
const sax = require("sax")
const axios = require("axios")
const gk = require("gauss-krueger")
const { default: PQueue } = require("p-queue")

const pqueue = new PQueue({ concurrency: 20 })

const db = require("../../db/matsim")

const N_TOTAL_NODES = 73689
const N_TOTAL_LINKS = 159039

let nNodes = 0
let nLinks = 0

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

async function getOSMEdge(MATSimLink) {
  const nodes = await db.getFromAndToNodes(MATSimLink)

  const getQuery = (fromNode, toNode) =>
    `[out:json];way(around:0,${fromNode.latitude},${fromNode.longitude},${toNode.latitude},${toNode.longitude})[highway~"motorway|trunk|primary|secondary|tertiary|residential|living_street|motorway_link|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|road|unclassified"];out ids;`

  const { elements: ways } = await axios
    .get("https://lz4.overpass-api.de/api/interpreter", {
      params: {
        data: getQuery(nodes[MATSimLink.from], nodes[MATSimLink.to]),
      },
    })
    .then(res => res.data)

  let warning = false
  if (ways.length === 0) {
    console.log(`Warning: No OSM edge found for MATSim link ${MATSimLink.id}`)
    warning = true
  }

  if (ways.length > 1) {
    console.log(`Warning: No unique OSM edge found for MATSim link ${MATSimLink.id}`)
    warning = true
  }

  if (warning) {
    console.log(ways)
    console.log(MATSimLink.dataValues)
    console.log(nodes[MATSimLink.from].dataValues)
    console.log(nodes[MATSimLink.to].dataValues)
    return "unknown"
  }

  const OSMEdge = ways[0].id

  await sleep(1000)

  return OSMEdge
}

async function processNetwork() {
  const MATSimLinks = await db.getAllLinks()
  for (const link of MATSimLinks) {
    const OSMEdge = await getOSMEdge(link)
    // await db.setOSMEdge(link.id, OSMEdge)

    console.log(`MATSim Link ${link.id} -> OSM Edge ${OSMEdge}`)
  }
}

const saxStream = sax.createStream(true)

saxStream.on("opentag", node => {
  if (node.name === "node") {
    const { id, x, y } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport nodes

    nNodes++

    const { latitude, longitude } = gk.toWGS({ x: parseFloat(x), y: parseFloat(y) })
    pqueue.add(async () => {
      await db.createMATSimNode(id, x, y, latitude, longitude)
      console.log(`Stored node ${id}`)
    })
    return
  }

  if (node.name === "link") {
    const { id, from, to } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport linkMappings
    nLinks++

    pqueue.add(async () => {
      await db.createMATSimLink(id, from, to)
      console.log(`Stored edge ${id}`)
    })
  }
})

saxStream.on("end", () => {
  pqueue.add(() => {
    const lastTimestamp = timestamp
    timestamp = new Date().getTime()
    console.log(`Done! (${timestamp - lastTimestamp}ms)`)
    console.log(`Total Nodes: ${nNodes}`)
    console.log(`Total Links: ${nLinks}`)
    // processNetwork()
  })
})

async function start() {
  await db.init(false)
  timestamp = new Date().getTime()
  console.log("Parsing MATSim network...")
  const nTotalNodes = await db.countNodes()
  const nTotalLinks = await db.countLinks()
  // if (nTotalNodes === N_TOTAL_NODES && nTotalLinks === N_TOTAL_LINKS) {
  //   processNetwork()
  // } else {
  //   // fs.createReadStream("../network/berlin-v5-network.xml").pipe(saxStream)
  //   fs.createReadStream(`${__dirname}/../network/simunto-network.xml`).pipe(saxStream)
  // }
  processNetwork()
}

start()
