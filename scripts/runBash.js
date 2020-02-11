const { spawn } = require("child_process")

const defaultOptions = {
  cwd: "./",
}

module.exports = (bash, options = defaultOptions) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${bash}`)
    const [command, ...args] = bash.split(" ")
    const child = spawn(command, args, {
      cwd: options.cwd,
    })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on("close", resolve)
  })
}
