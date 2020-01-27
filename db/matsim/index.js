const { join } = require("path")
const { Sequelize } = require("sequelize")

const MATSimLink = require("../models/MATSimLink")
const MATSimNode = require("../models/MATSimNode")

const models = {
  MATSimLink,
  MATSimNode,
}

let sequelize = null

exports.init = async dbPath => {
  // Create connection
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath || join(__dirname, "matsim.sqlite"),
    logging: false,
  })

  // Initialize all models
  Object.keys(models).forEach(m => {
    models[m] = models[m](sequelize)
  })

  // Sync models to DB
  await sequelize.sync({ force: false })
}

exports.createMATSimNode = async (id, x, y) => {
  await models.MATSimNode.findOrCreate({
    where: { id },
    defaults: { id, x, y },
  })
}

exports.createMATSimLink = async (id, from, to) => {
  await models.MATSimLink.findOrCreate({
    where: { id },
    defaults: { id, from, to },
  })
}
