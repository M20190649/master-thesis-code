const fs = require("fs")
const { join } = require("path")
const gk = require("gauss-krueger")
const sax = require("sax")
const XMLBuilder = require("xmlbuilder")

const parseCLIOptions = require("../../shared/parseCLIOptions")
const { validateOptions } = require("../../shared/helpers")

const optionDefinitions = [
  {
    name: "network",
    type: String,
    description:
      "The scenario that should be loaded \n (Possible values: 1pct, 10pct, default: 1pct)",
    required: true,
  },
  {
    name: "output",
    type: String,
    defaultValue: join(__dirname, "trips.xml"),
    description: "Filepath for the output XML file",
  },
  {
    name: "bbox",
    type: bboxString => bboxString.split(",").map(Number),
    typeLabel: "south,west,north,east",
    description: "Only parse car rides within this bbox",
    required: true,
  },
  {
    name: "filter-pt",
    type: Boolean,
    description: "Filter public transport nodes and links",
    defaultValue: true,
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

let initialNodeCounter = 0
let initialLinkCounter = 0
let finalNodeCounter = 0
let finalLinkCounter = 0

const XML = XMLBuilder.begin()
XML.raw('<?xml version="1.0" encoding="UTF-8"?>')
XML.raw(
  '<!DOCTYPE network SYSTEM "http://www.matsim.org/files/dtd/network_v2.dtd">'
)

const networkXML = XML.element("network")
networkXML.raw("")
networkXML.comment(
  "======================================================================"
)
networkXML.raw("")
const nodesXML = networkXML.element("nodes")
networkXML.raw("")
networkXML.comment(
  "======================================================================"
)
networkXML.raw("")
const linksXML = networkXML.element("links")
networkXML.raw("")
networkXML.comment(
  "======================================================================"
)
networkXML.raw("")

const allNodes = {}
const addedNodes = new Set()
let saveLink = true
let currentLink = null
let currentAttributes = null

function onError(err) {
  console.error(err)
}

function onOpenTag(node, options) {
  const currentTag = node.name
  if (currentTag === "node") {
    initialNodeCounter += 1
    const isPT = node.attributes.id.startsWith("pt")
    if (options["filter-pt"] && isPT) {
      return
    }

    allNodes[node.attributes.id] = node.attributes
  }

  if (currentTag === "link") {
    initialLinkCounter += 1
    const isPT = node.attributes.id.startsWith("pt")
    if (options["filter-pt"] && isPT) {
      saveLink = false
      return
    }

    const { from, to } = node.attributes
    const fromNode = allNodes[from]
    const toNode = allNodes[to]

    const fromGK4coordinates = {
      x: parseFloat(fromNode.x),
      y: parseFloat(fromNode.y),
    }
    const fromWGS84Coordinates = gk.toWGS(fromGK4coordinates)
    const { latitude: fromLat, longitude: fromLong } = fromWGS84Coordinates
    const toGK4coordinates = {
      x: parseFloat(toNode.x),
      y: parseFloat(toNode.y),
    }
    const toWGS84Coordinates = gk.toWGS(toGK4coordinates)
    const { latitude: toLat, longitude: toLong } = toWGS84Coordinates

    const [south, west, north, east] = options.bbox

    const fromOutOfBounds =
      fromLat < south ||
      fromLat > north ||
      fromLong < west ||
      fromLong > east ||
      toLat < south ||
      toLat > north ||
      toLong < west ||
      toLong > east

    const toOutOfBounds =
      fromLat < south ||
      fromLat > north ||
      fromLong < west ||
      fromLong > east ||
      toLat < south ||
      toLat > north ||
      toLong < west ||
      toLong > east

    if (fromOutOfBounds && toOutOfBounds) {
      // Link is out of bounds
      saveLink = false
      return
    }

    saveLink = true

    if (!addedNodes.has(from)) {
      nodesXML.element("node", fromNode)
      finalNodeCounter += 1
      addedNodes.add(from)
    }

    if (!addedNodes.has(to)) {
      nodesXML.element("node", toNode)
      finalNodeCounter += 1
      addedNodes.add(to)
    }

    currentLink = linksXML.element(currentTag, node.attributes)
    finalLinkCounter += 1
  }

  if (currentTag === "attributes") {
    if (saveLink) {
      currentAttributes = currentLink.element(currentTag, node.attributes)
    }
  }
  if (currentTag === "attribute") {
    if (saveLink) {
      currentAttributes.element(currentTag, node.attributes)
    }
  }
}

async function filterNetwork(callerOptions) {
  return new Promise((resolve, reject) => {
    const options = { ...CLIOptions, ...callerOptions }

    validateOptions(options, optionDefinitions)

    if (!fs.existsSync(options.output)) {
      const saxStream = sax.createStream(true)
      saxStream.on("error", onError)
      saxStream.on("opentag", node => onOpenTag(node, options))
      saxStream.on("end", () => {
        console.log("Initial nodes: ", initialNodeCounter)
        console.log("Initial links: ", initialLinkCounter)
        console.log()
        console.log("Filtered nodes: ", initialNodeCounter - finalNodeCounter)
        console.log("Filtered links: ", initialLinkCounter - finalLinkCounter)
        console.log()
        console.log("Total nodes: ", finalNodeCounter)
        console.log("Total links: ", finalLinkCounter)

        fs.writeFileSync(options.output, XML.end({ pretty: true }))
        resolve()
      })

      fs.createReadStream(options.network).pipe(saxStream)
    } else {
      console.log("Filtered MATSim network already exists")
    }
  })
}

if (CLIOptions.run) {
  filterNetwork()
}

module.exports = filterNetwork
