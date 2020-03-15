const { spawn } = require("child_process")

exports.pad = n => (n < 10 ? `0${n}` : n)

exports.getDateString = customDate => {
  const date = customDate || new Date()
  return `${this.pad(date.getUTCFullYear())}-${this.pad(date.getUTCMonth() + 1)}-${this.pad(
    date.getUTCDate()
  )}`
}

exports.getTimeString = customDate => {
  const date = customDate || new Date()
  return `${this.pad(date.getUTCHours())}-${this.pad(date.getUTCMinutes())}-${this.pad(
    date.getUTCSeconds()
  )}`
}

const defaultOptions = {
  cwd: "./",
}
exports.runBash = (bash, options = defaultOptions) => {
  let bashCommand = bash
  if (Array.isArray(bash)) {
    bashCommand = bash.join(" ")
  }

  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${bashCommand}`)
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
