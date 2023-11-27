const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid"); // Import uuid correctly
const sequelize = require("../config/db");
const User = require("./user");

const Posts = sequelize.define("Post", {
  id: {
    type: DataTypes.UUID, // Change the type to UUID
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(), // Use uuidv4 as the default value
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
    type: DataTypes.UUID, // Change the type to UUID
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

// Establish the association
Posts.belongsTo(User, { foreignKey: "id_user" });
User.hasMany(Posts, { foreignKey: "id_user" });

module.exports = Posts;
