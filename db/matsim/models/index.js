let MATSimLink = require("../models/MATSimLink")
let MATSimNode = require("../models/MATSimNode")

module.exports = sequelize => {
  MATSimLink = MATSimLink(sequelize)
  MATSimNode = MATSimNode(sequelize)

  return {
    MATSimLink,
    MATSimNode,
  }
}
