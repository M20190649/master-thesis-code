const { spawn } = require("child_process")
const fs = require("fs")
const gunzip = require("gunzip-file")
const axios = require("axios")

exports.pad = n => (n < 10 ? `0${n}` : n)

exports.getDateString = (customDate, separator = "-") => {
  const date = customDate || new Date()
  return [
    this.pad(date.getUTCFullYear()),
    separator,
    this.pad(date.getUTCMonth() + 1),
    separator,
    this.pad(date.getUTCDate()),
  ].join("")
}

exports.getTimeString = (customDate, separator = "-") => {
  const date = customDate || new Date()
  return [
    this.pad(date.getUTCHours()),
    separator,
    this.pad(date.getUTCMinutes()),
    separator,
    this.pad(date.getUTCSeconds()),
  ].join("")
}

const defaultOptions = {
  cwd: "./",
}
exports.runBash = (bash, options = defaultOptions) => {
  let bashCommand = bash
  if (Array.isArray(bash)) {
    bashCommand = bash.filter(x => x !== "").join(" ")
  }

  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${bashCommand}\n`)
    const [command, ...args] = bashCommand.split(" ")
    const child = spawn(command, args, {
      cwd: options.cwd,
    })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on("close", resolve)
    child.on("error", error => {
      throw new Error(error)
    })
  })
}

exports.validateOptions = (options, optionDefinitions) => {
  for (const option of optionDefinitions) {
    const { name } = option

    if (option.required && options[name] === undefined) {
      throw new Error(
        `Missing required option: "${name}". Run the --help command for more information.`
      )
    }

    if (option.possibleValues && options[name] !== undefined) {
      if (!option.possibleValues.includes(options[name])) {
        throw new Error(
          `Option "${name}" must be one of the following: ${option.possibleValues.join(
            ", "
          )}`
        )
      }
    }

    if (options[name] === undefined && option.defaultValue !== undefined) {
      options[name] = option.defaultValue
    }
  }
}

exports.logSection = sectionName => {
  const maxLength = 60
  const restSpaceLength = maxLength - sectionName.length - 2
  const n1 = Math.floor(restSpaceLength / 2)
  const n2 = restSpaceLength % 2 === 0 ? n1 : n1 + 1
  console.log(`${"-".repeat(n1)} ${sectionName} ${"-".repeat(n2)}\n`)
}

exports.gunzip = (zipFile, output) =>
  new Promise((resolve, reject) => {
    gunzip(zipFile, output, resolve)
  })

exports.downloadFile = (url, filepath, timeout) =>
  new Promise((resolve, reject) => {
    axios
      .get(url, {
        responseType: "stream",
        timeout: timeout || 0,
      })
      .then(res => {
        const t = new Date().getTime()
        const outputStream = fs.createWriteStream(filepath)
        outputStream.on("close", () => {
          // console.log("Download time:", new Date().getTime() - t, "ms")
          resolve()
        })
        res.data.pipe(outputStream)
      })
      .catch(error => reject(error))
  })

exports.getAllTimesteps = (date, timestep) => {
  const timesteps = []
  const stop = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  let currentTimestep = date
  while (currentTimestep < stop) {
    timesteps.push(currentTimestep.toISOString())
    currentTimestep = new Date(currentTimestep.getTime() + timestep * 60 * 1000)
  }
  return timesteps
}
