const { spawn } = require("child_process")

const pad = n => (n < 10 ? `0${n}` : n)

exports.getDateString = () => {
  const now = new Date()
  return `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

exports.getTimeString = () => {
  const now = new Date()
  return `${pad(now.getHours())}-${pad(now.getMinutes() + 1)}-${pad(now.getSeconds())}`
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
    console.log(`Executing: ${bashCommand}`)
    const [command, ...args] = bashCommand.split(" ")
    const child = spawn(command, args, {
      cwd: options.cwd,
    })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on("close", resolve)
  })
}
