const { join } = require("path")
const fs = require("fs")

const parseCLIOptions = require("../../shared/parseCLIOptions")
const { gunzip, downloadFile } = require("../../shared/helpers")

const CLIOptions = parseCLIOptions()

async function downloadMATSimNetwork() {
  const filename = "berlin-v5-network.xml"
  const networkDir = join(__dirname, "network")
  const networkFile = join(networkDir, filename)
  const networkZipFile = `${networkFile}.gz`
  const url = `https://svn.vsp.tu-berlin.de/repos/public-svn/matsim/scenarios/countries/de/berlin/berlin-v5.4-10pct/input/${filename}.gz`

  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir)
  }

  if (!fs.existsSync(networkZipFile)) {
    console.log("Downloading network file...")
    await downloadFile(url, networkZipFile)
    console.log("Done")
  } else {
    console.log("Zipped network file already exists")
  }

  if (!fs.existsSync(networkFile)) {
    console.log("Unzipping network file...")
    await gunzip(networkZipFile, networkFile)
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
