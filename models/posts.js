const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../config/db");
const User = require("./user");

const Posts = sequelize.define("Post", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  img_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  lon: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  id_cat: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_user: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

Posts.belongsTo(User, {
  foreignKey: "id_user",
  constraints: false,
  foreignKeyConstraint: true,
});
User.hasMany(Posts, { foreignKey: "id_user" });

module.exports = Posts;
