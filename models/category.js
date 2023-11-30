const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Category = sequelize.define("Category", {
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
});

module.exports = Category;
