const fs = require("fs")
const axios = require("axios")

const { runBash } = require("../shared/helpers")

async function download() {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream("network/berlin-v5-network.xml.gz")
    axios
      .get(
        "https://svn.vsp.tu-berlin.de/repos/public-svn/matsim/scenarios/countries/de/berlin/berlin-v5.4-10pct/input/berlin-v5-network.xml.gz",
        {
          responseType: "stream",
        }
      )
      .then(res => res.data.pipe(outputStream))

    outputStream.on("close", resolve)
  })
}

async function run() {
  if (!fs.existsSync("network/berlin-v5-network.xml.gz")) {
    await download()
  }

  if (!fs.existsSync("./network/berlin-v5-network.xml")) {
    await runBash("gunzip -k network/berlin-v5-network.xml.gz")
  }
}

run()
