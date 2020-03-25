const { spawn } = require("child_process")

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
          `Option "${name}" must be one of the following: ${option.possibleValues.join(", ")}`
        )
      }
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
