const fs = require("fs")
const { join } = require("path")
const sax = require("sax")
const gk = require("gauss-krueger")
const XMLBuilder = require("xmlbuilder")

const nodesXML = XMLBuilder.create("nodes")
const linksXML = XMLBuilder.create("links")

const config = fs.readFileSync("simunto.txt", "utf8")

let timestamp = new Date().getTime()

let nNodes = 0
let nLinks = 0
const nodes = {}
const links = {}

function buildNetwork() {
  console.log("Building network...")

  const linksData = config
    .trim()
    .split("\n")
    .map(line => line.split("\t").slice(0, 3))

  const linkIds = linksData.map(linkData => linkData[0])
  const nodeIds = Array.from(
    new Set(
      linksData.reduce((list, l) => {
        list.push(l[1], l[2])
        return list
      }, [])
    )
  )

  for (const linkId of linkIds) {
    if (linkId.startsWith("pt_")) continue
    linksXML.element("link", links[linkId])
  }

  for (const nodeId of nodeIds) {
    if (nodeId.startsWith("pt_")) continue
    const { id, x, y } = nodes[nodeId]
    nodesXML.element("node", { id, x, y })
  }

  const xml = XMLBuilder.begin()
    .raw(`<?xml version="1.0" encoding="UTF-8"?>`)
    .raw(
      `<!DOCTYPE network SYSTEM "http://www.matsim.org/files/dtd/network_v2.dtd">`
    )
    .element("network")
    .importDocument(nodesXML)
    .importDocument(linksXML)
    .end({ pretty: true, allowEmpty: true })

  fs.writeFileSync("simunto-network.xml", xml)

  const lastTimestamp = timestamp
  timestamp = new Date().getTime()
  console.log(`Done! (${timestamp - lastTimestamp}ms)`)
}

const saxStream = sax.createStream(true)

saxStream.on("opentag", node => {
  if (node.name === "node") {
    const { id, x, y } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport nodes
    nNodes += 1
    const { latitude, longitude } = gk.toWGS({
      x: parseFloat(x),
      y: parseFloat(y),
    })
    nodes[id] = { id, x, y, latitude, longitude }
    return
  }

  if (node.name === "link") {
    const { id, from, to } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport linkMappings
    nLinks += 1
    links[id] = { id, from, to }
  }
})

saxStream.on("end", () => {
  const lastTimestamp = timestamp
  timestamp = new Date().getTime()
  console.log(`Done! (${timestamp - lastTimestamp}ms)`)
  console.log(`Total Nodes: ${nNodes}`)
  console.log(`Total Links: ${nLinks}`)
  buildNetwork()
})

timestamp = new Date().getTime()

console.log("Parsing MATSim network...")
fs.createReadStream(
  join(__dirname, "..", "matsim", "network", "berlin-v5-network.xml")
).pipe(saxStream)
