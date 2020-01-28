const { DataTypes } = require("sequelize")

module.exports = sequelize => {
  return sequelize.define("MATSimNode", {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    x: {
      type: DataTypes.NUMBER,
    },
    y: {
      type: DataTypes.NUMBER,
    },
    latitude: {
      type: DataTypes.NUMBER,
    },
    longitude: {
      type: DataTypes.NUMBER,
    },
  })
}
