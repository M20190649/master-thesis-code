const { join } = require("path")
const fs = require("fs")
const axios = require("axios")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { runBash } = require("../shared/helpers")

const CLIOptions = parseCLIOptions([
  {
    name: "scenario",
    type: String,
    description:
      "The scenario that should be loaded \n (Possible values: 1pct, 10pct, default: 1pct)",
    defaultValue: "1pct",
  },
])

async function download(scenario, zipFile) {
  return new Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(zipFile)
    axios
      .get(
        `https://svn.vsp.tu-berlin.de/repos/public-svn/matsim/scenarios/countries/de/berlin/berlin-v5.4-${scenario}/output-berlin-v5.4-${scenario}/berlin-v5.4-${scenario}.output_plans.xml.gz`,
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

async function downloadMATSimPlans(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  const availableScenarios = ["1pct", "10pct"]
  if (!availableScenarios.includes(options.scenario)) {
    throw new Error("Unknown scenario")
  }

  const filename = `berlin-v5.4-${options.scenario}.output_plans.xml`
  const plansDir = join(__dirname, "plans")
  const plansFile = join(plansDir, filename)
  const plansZipFile = `${plansFile}.gz`

  const log = x => (options.verbose ? console.log(x) : null)

  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir)
  }

  if (!fs.existsSync(plansZipFile)) {
    log("Downloading plans file...")
    await download(options.scenario, plansZipFile)
    log("Done")
  } else {
    log("Zipped plans file already exists")
  }

  if (!fs.existsSync(plansFile)) {
    log("Unzipping plans file...")
    await unzip(plansZipFile)
    log("Done!")
  } else {
    log("Unzipped plans file already exists")
  }

  return plansFile
}

if (CLIOptions.run) {
  downloadMATSimPlans()
}

module.exports = downloadMATSimPlans
