const fs = require("fs")
const xml2js = require("xml2js")

function parsePlan(plan) {
  const { $: planAttributes, $$: planChildren } = plan
  for (const planChild of planChildren) {
    const { "#name": tagName } = planChild
    if (tagName !== "leg") continue

    const { $: legAttributes, $$: legChildren } = planChild
    if (legAttributes.mode !== "car") continue

    const { dep_time: departureTime } = legAttributes
    const routeTag = legChildren[0]

    const { $: routeAttributes, $$: routeChildren, _: linkList } = routeTag
    // console.log(routeAttributes)
    // console.log(routeTag)
    // console.log(linkList)
  }
}

function parsePerson(person) {
  const { $: attributes, $$: children } = person
  console.log(attributes)
  for (const node of children) {
    const { "#name": tagName } = node
    if (tagName === "plan") {
      parsePlan(node)
    }
  }
}

function parsePopulation(population) {
  const { $: attributes, $$: children } = population
  for (const node of children) {
    const { "#name": tagName } = node
    if (tagName === "person") {
      parsePerson(node)
    }
  }
}

function parseSync() {
  const xml = fs.readFileSync(this.path, "utf8")
  xml2js.parseString(xml, { explicitChildren: true, preserveChildrenOrder: true }, (err, res) => {
    // parsePlan(res.plan)
    if (!res.population) {
      throw new Error("Error: No population found")
    }

    parsePopulation(res.population)
  })
}

module.exports = parseSync
