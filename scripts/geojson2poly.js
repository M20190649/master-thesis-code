const fs = require("fs")
const commandLineArgs = require("command-line-args")
const XMLBuilder = require("xmlbuilder")

const optionDefinitions = [
  { name: "input", alias: "i", type: String },
  { name: "output", alias: "o", type: String },
]
const options = commandLineArgs(optionDefinitions)

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

fs.writeFileSync(`${options.output || "polygon.xml"}`, xml)
