const gk = require("gauss-krueger")
const axios = require("axios")

const linkMapping = {}

async function getOSMEdge(edge, coordinates) {
  if (linkMapping[edge]) {
    return linkMapping[edge]
  }

  await new Promise(res =>
    setTimeout(() => {
      res()
    }, 1000)
  )

  return "69696969"
}

module.exports = getOSMEdge
