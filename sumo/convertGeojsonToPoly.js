const fs = require("fs")
const commandLineArgs = require("command-line-args")
const XMLBuilder = require("xmlbuilder")

const { runBash } = require("../shared/helpers")

const optionDefinitions = [
  { name: "geojson", type: String },
  { name: "network", type: String },
  { name: "output", type: String },
]
const options = commandLineArgs(optionDefinitions)

if (options.geojson === undefined) {
  throw new Error("Error: You must supply a path to a GeoJSON file")
}

if (options.network === undefined) {
  throw new Error("Error: You must supply a path to a SUMO network file")
}

if (options.output === undefined) {
  throw new Error("Error: You must supply a path to a file where the output XML should be stored")
}

fs.mkdirSync("tmp")

const file = fs.readFileSync(options.input, "utf8")
const geojson = JSON.parse(file)
const { coordinates } = geojson.features[0].geometry

const coordinateList = []
for (const [long, lat] of coordinates[0]) {
  coordinateList.push(`${long},${lat}`)
}

const xml = XMLBuilder.begin()
  .element("poly", {
    id: 0,
    shape: coordinateList.join(" "),
  })
  .end({ pretty: true })

fs.writeFileSync("tmp/polygon.xml", xml)

runBash(
  `polyconvert --xml-files tmp/polygon.xml --net-file ${options.network} --output-file ${options.output}`
).then(() => {
  fs.rmdirSync("tmp")
})
