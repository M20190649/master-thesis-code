const { basename } = require("path")
const commandLineArgs = require("command-line-args")
const commandLineUsage = require("command-line-usage")

const defaultOptions = [
  {
    name: "run",
    alias: "r",
    type: Boolean,
    description: "Run the code \n (Otherwise this file just exports a node module)",
  },
  {
    name: "verbose",
    alias: "v",
    type: Boolean,
    description: "Tell you what I am doing",
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "Print the usage guide",
  },
]

function getCallerFile() {
  const originalFunc = Error.prepareStackTrace

  let callerfile
  try {
    const error = new Error()

    Error.prepareStackTrace = function(err, stack) {
      return stack
    }

    const currentfile = error.stack.shift().getFileName()

    while (error.stack.length) {
      callerfile = error.stack.shift().getFileName()

      if (currentfile !== callerfile) break
    }
  } catch (err) {
    console.log(err)
  }

  Error.prepareStackTrace = originalFunc

  return callerfile
}

module.exports = (customOptions = []) => {
  const optionDefinitions = [...defaultOptions, ...customOptions]
  const callerFile = basename(getCallerFile())
  const sections = [
    {
      header: `Options for ${callerFile}`,
      content: `$ node ${callerFile} <options> <command>`,
    },
    {
      optionList: optionDefinitions,
    },
  ]
  const usage = commandLineUsage(sections)

  const options = commandLineArgs(optionDefinitions)

  if (options.help) {
    console.log(usage)
    process.exit(0)
  }

  return options
}
