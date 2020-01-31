const fs = require("fs")
const sax = require("sax")
const axios = require("axios")
const gk = require("gauss-krueger")
const { default: PQueue } = require("p-queue")

const pqueue = new PQueue({ concurrency: 1000 })

const query = fs.readFileSync("./optimizedQuery.txt", "utf8")
const db = require("../../db/matsim")

const N_TOTAL_NODES = 73689
const N_TOTAL_LINKS = 159039

let nNodes = 0
let nLinks = 0

let timestamp = new Date().getTime()

async function sleep(duration) {
  console.log(`Sleeping ${duration}ms...`)
  return new Promise(resolve => setTimeout(resolve, duration))
}

const getQuery = async (MATSimLink, radius = 5) => {
  const nodes = await db.getFromAndToNodes(MATSimLink)
  const { [MATSimLink.from]: fromNode, [MATSimLink.to]: toNode } = nodes

  return query
    .replace(/{radius}/g, radius)
    .replace("{fromLatitude},{fromLongitude}", `${fromNode.latitude},${fromNode.longitude}`)
    .replace("{toLatitude},{toLongitude}", `${toNode.latitude},${toNode.longitude}`)
    .replace(/{MATSimLinkId}/g, MATSimLink.id)
}

async function processLinks(MATSimLinks, radius = 5) {
  let n = 0
  let currentQuery = `[out:json];`

  const unknownLinks = []
  // Loop through all links
  for (const link of MATSimLinks) {
    // if (link.osmEdge !== null) {
    //   continue
    // }

    // Get the query for 7 links (length of 7 queries seems to be the max for the overpass API)
    currentQuery += await getQuery(link, radius)
    currentQuery += "\n\n"
    n++
    if (n === 7) {
      // Send the query
      const { elements: mappings } = await axios
        .get("https://lz4.overpass-api.de/api/interpreter", {
          params: {
            data: currentQuery,
          },
        })
        .then(res => res.data)

      // Write results to DB
      for (const mapping of mappings) {
        if (mapping.tags.OSMEdge === "unknown") {
          console.log(`Warning: No OSM edge found for MATSim link ${mapping.tags.MATSimLink}`)
          unknownLinks.push(mapping.tags.MATSimLink)
        } else {
          await db.setOSMEdge(mapping.tags.MATSimLink, mapping.tags.OSMEdge)
          console.log(mapping.tags.MATSimLink, mapping.tags.OSMEdge)
        }
      }

      // Reset query and counter
      currentQuery = `[out:json];`
      n = 0

      await sleep(2000)
    }
  }

  const additionalRadius = 5
  if (unknownLinks.length !== 0) {
    const unknownLinkObjects = db.getLinksWithId(unknownLinks)
    console.log(
      `Repeating queries with increased radius (${radius + additionalRadius}m) for ${
        unknownLinks.length
      } unknown links`
    )
    processLinks(unknownLinkObjects, radius + additionalRadius)
  }
}

const saxStream = sax.createStream(true)
let n = 0
saxStream.on("opentag", node => {
  if (node.name === "node") {
    const { id, x, y } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport nodes

    nNodes++

    const { latitude, longitude } = gk.toWGS({ x: parseFloat(x), y: parseFloat(y) })
    pqueue.add(async () => {
      await db.createMATSimNode(id, x, y, latitude, longitude)
      n++
      if (n % 1000 === 0) {
        console.log(`Stored node ${id}`)
      }
    })
    return
  }

  if (node.name === "link") {
    const { id, from, to } = node.attributes
    if (id.startsWith("pt_")) return // skip public transport linkMappings
    nLinks++

    pqueue.add(async () => {
      await db.createMATSimLink(id, from, to)
      n++
      if (n % 1000 === 0) {
        console.log(`Stored edge ${id}`)
      }
    })
  }
})

saxStream.on("end", () => {
  pqueue.add(async () => {
    const lastTimestamp = timestamp
    timestamp = new Date().getTime()
    console.log(`Done! (${timestamp - lastTimestamp}ms)`)
    console.log(`Total Nodes: ${nNodes}`)
    console.log(`Total Links: ${nLinks}`)
    // const MATSimLinks = await db.getAllLinks()
    // processLinks(MATSimLinks)
  })
})

async function start() {
  await db.init(true)
  timestamp = new Date().getTime()
  console.log("Parsing MATSim network...")
  const nTotalNodes = await db.countNodes()
  const nTotalLinks = await db.countLinks()

  fs.createReadStream("../network/berlin-v5-network.xml").pipe(saxStream)
  // fs.createReadStream(`${__dirname}/../network/simunto-network.xml`).pipe(saxStream)

  // const MATSimLinks = await db.getAllLinks()
  // processLinks(MATSimLinks)
}

start()
