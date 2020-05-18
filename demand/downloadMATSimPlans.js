const { join } = require("path")
const fs = require("fs")

const parseCLIOptions = require("../shared/parseCLIOptions")
const { validateOptions, gunzip, downloadFile } = require("../shared/helpers")

const optionDefinitions = [
  {
    name: "scenario",
    type: String,
    description:
      "The scenario that should be loaded \n (Possible values: 1pct, 10pct, default: 1pct)",
    defaultValue: "1pct",
    possibleValues: ["1pct", "10pct"],
  },
]

const CLIOptions = parseCLIOptions(optionDefinitions)

async function downloadMATSimPlans(callerOptions) {
  const options = { ...CLIOptions, ...callerOptions }

  validateOptions(options, optionDefinitions)

  const { scenario } = options
  const filename = `berlin-v5.4-${scenario}.output_plans.xml`
  const plansDir = join(__dirname, "plans")
  const plansFile = join(plansDir, filename)
  const plansZipFile = `${plansFile}.gz`
  const url = `https://svn.vsp.tu-berlin.de/repos/public-svn/matsim/scenarios/countries/de/berlin/berlin-v5.4-${scenario}/output-berlin-v5.4-${scenario}/${filename}.gz`

  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir)
  }

  if (!fs.existsSync(plansZipFile)) {
    console.log(`Downloading ${options.scenario} plans file...`)
    await downloadFile(url, plansZipFile)
    console.log(`Done`)
  } else {
    console.log(`Zipped ${options.scenario} plans file already exists`)
  }

  if (!fs.existsSync(plansFile)) {
    console.log(`Unzipping ${options.scenario} plans file...`)
    await gunzip(plansZipFile, plansFile)
    console.log(`Done!`)
  } else {
    console.log(`Unzipped ${options.scenario} plans file already exists`)
  }

  return plansFile
}

if (CLIOptions.run) {
  downloadMATSimPlans()
}

module.exports = downloadMATSimPlans
