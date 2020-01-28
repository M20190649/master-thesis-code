let MATSimLink = require("../models/MATSimLink")
let MATSimNode = require("../models/MATSimNode")

module.exports = sequelize => {
  MATSimLink = MATSimLink(sequelize)
  MATSimNode = MATSimNode(sequelize)

  MATSimLink.belongsToMany(MATSimNode, { through: "LinkNodeMapping" })
  MATSimNode.belongsToMany(MATSimLink, { through: "LinkNodeMapping" })

  return {
    MATSimLink,
    MATSimNode,
  }
}