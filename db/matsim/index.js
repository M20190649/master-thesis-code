const { join } = require("path")
const { Sequelize } = require("sequelize")

const initModels = require("./models")

let models = null
let sequelize = null

exports.init = async dbPath => {
  // Create connection
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath || join(__dirname, "matsim.sqlite"),
    logging: false,
  })

  // Initialize all models
  models = initModels(sequelize)

  // Sync models to DB
  await sequelize.sync({ force: true })
}

exports.testConnection = async () => {
  sequelize
    .authenticate()
    .then(() => {
      console.log("Connection has been established successfully.")
    })
    .catch(err => {
      console.error("Unable to connect to the database:", err)
    })
}

exports.createMATSimNode = async (id, x, y, latitude, longitude) => {
  await models.MATSimNode.findOrCreate({
    where: { id },
    defaults: { id, x, y, latitude, longitude },
  })
}

exports.createMATSimLink = async (id, from, to) => {
  const MATSimLink = await models.MATSimLink.create({ id, from, to })

  const fromMATSimNode = await models.MATSimNode.findOne({ where: { id: from } })
  const toMATSimNode = await models.MATSimNode.findOne({ where: { id: to } })

  if (fromMATSimNode) {
    await MATSimLink.addMATSimNode(fromMATSimNode)
    await fromMATSimNode.addMATSimLink(MATSimLink)
  }

  if (toMATSimNode) {
    await MATSimLink.addMATSimNode(toMATSimNode)
    await toMATSimNode.addMATSimLink(MATSimLink)
  }
}

exports.countNodes = async () => {
  const nNodes = await sequelize.models.MATSimNode.count()
  return nNodes
}

exports.countLinks = async () => {
  const nLinks = await models.MATSimLink.count()
  return nLinks
}

exports.getAllLinks = async () => {
  const links = await models.MATSimLink.findAll()
  return links
}

exports.setOSMEdge = async (linkId, OSMEdge) => {
  await models.MATSimLink.update({ osmEdge: OSMEdge }, { where: { id: linkId } })
}
