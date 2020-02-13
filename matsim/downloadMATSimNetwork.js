const { join } = require("path")
const fs = require("fs")
const axios = require("axios")

const { runBash } = require("../shared/helpers")

const networkFile = join(__dirname, "network", "berlin-v5-network.xml")
const networkZipFile = join(__dirname, "network", "berlin-v5-network.xml.gz")

async function download() {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(networkZipFile)
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

async function unzip() {
  await runBash(`gunzip -k ${networkZipFile}`)
}

async function downloadMATSimNetwork() {
  if (!fs.existsSync(networkZipFile)) {
    await download()
  }

  if (!fs.existsSync(networkFile)) {
    await unzip()
  }
}

downloadMATSimNetwork()
