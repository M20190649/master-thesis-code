const { join } = require("path")
const fs = require("fs")
const axios = require("axios")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash } = require("../shared/helpers")

const CLIOptions = parseCLIOptions()

async function download(zipFile) {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(zipFile)
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

async function unzip(zipFile) {
  await runBash(`gunzip -k ${zipFile}`)
}

async function downloadMATSimNetwork(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  const networkDir = join(__dirname, "network")
  const networkFile = join(networkDir, "berlin-v5-network.xml")
  const networkZipFile = `${networkFile}.gz`

  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir)
  }

  if (!fs.existsSync(networkZipFile)) {
    console.log("Downloading network file...")
    await download(networkZipFile)
    console.log("Done")
  } else {
    console.log("Zipped network file already exists")
  }

  if (!fs.existsSync(networkFile)) {
    console.log("Unzipping network file...")
    await unzip(networkZipFile)
    console.log("Done!")
  } else {
    console.log("Unzipped network file already exists")
  }

  return networkFile
}

if (CLIOptions.run) {
  downloadMATSimNetwork()
}

module.exports = downloadMATSimNetwork
