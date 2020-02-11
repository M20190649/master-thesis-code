const pad = n => (n < 10 ? `0${n}` : n)

exports.getDateString = () => {
  const now = new Date()
  return `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

exports.getTimeString = () => {
  const now = new Date()
  return `${pad(now.getHours())}-${pad(now.getMinutes() + 1)}-${pad(now.getSeconds())}`
}