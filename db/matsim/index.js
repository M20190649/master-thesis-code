const { join } = require("path")
const { Sequelize } = require("sequelize")

const initModels = require("./models")

let models = null
let sequelize = null

exports.init = async clearDb => {
  // Create connection
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: join(__dirname, "matsim.sqlite"),
    logging: false,
  })

  // Initialize all models
  models = initModels(sequelize)

  // Sync models to DB
  await sequelize.sync({ force: clearDb || false })
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
  await models.MATSimNode.create({ id, x, y, latitude, longitude })
}

exports.createMATSimLink = async (id, from, to) => {
  await models.MATSimLink.create({ id, from, to })
}

exports.getFromAndToNodes = async MATSimLink => {
  const nodes = await models.MATSimNode.findAll({
    where: {
      id: [MATSimLink.from, MATSimLink.to],
    },
  })
  return nodes
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
