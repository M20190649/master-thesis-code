const fs = require("fs")
const path = require("path")
const xml2js = require("xml2js")

// const readStream = fs.createReadStream("./berlin-v5.4-10pct.output_plans.xml")
// const writeStream = fs.createWriteStream("./output-data.xml")

// const maxChunks = 1
// let chunkCounter = 0
// readStream.on("data", (chunk) => {
//   chunkCounter++
//   writeStream.write(chunk)
//   if (chunkCounter === maxChunks) {
//     process.exit(0)
//   }
// })

function parsePlan(plan) {
  const { $: attributes, $$: children } = plan
  console.log(children)
}

const xml = fs.readFileSync(path.join(__dirname, "test-plan.xml"), "utf8")

xml2js.parseString(xml, { explicitChildren: true, preserveChildrenOrder: true }, (err, res) => {
  parsePlan(res.plan)
})
