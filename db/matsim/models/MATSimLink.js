const { DataTypes } = require("sequelize")

module.exports = sequelize => {
  return sequelize.define("MATSimLink", {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    from: {
      type: DataTypes.STRING,
    },
    to: {
      type: DataTypes.STRING,
    },
    osmEdge: {
      type: DataTypes.STRING,
    },
  })
}
