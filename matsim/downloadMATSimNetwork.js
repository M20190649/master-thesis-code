const { join } = require("path")
const fs = require("fs")
const axios = require("axios")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash } = require("../shared/helpers")

const options = parseCLIOptions([
  {
    name: "name",
    type: String,
    description: "Custom name for the XML network file",
    defaultValue: "berlin-v5-network.xml",
  },
])

const networkFile = join(__dirname, "network", options.name)
const networkZipFile = `${networkFile}.gz`

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

  return networkFile
}

if (options.run) {
  downloadMATSimNetwork()
}

module.exports = downloadMATSimNetwork
