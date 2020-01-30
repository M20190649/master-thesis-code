const { DataTypes } = require("sequelize")

module.exports = sequelize => {
  return sequelize.define("MATSimNode", {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    x: {
      type: DataTypes.FLOAT,
    },
    y: {
      type: DataTypes.FLOAT,
    },
    latitude: {
      type: DataTypes.FLOAT,
    },
    longitude: {
      type: DataTypes.FLOAT,
    },
  })
}
