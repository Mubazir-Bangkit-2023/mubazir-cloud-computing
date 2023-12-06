const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../config/db");
const User = require("./user");
const Category = require("./category");

const Posts = sequelize.define("Post", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  },
  title: {
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
  imgUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  freshness: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pickupTime: {
    type: DataTypes.DATE,
    allowNull: true,
    time: true,
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  lon: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: "id",
    },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

Posts.belongsTo(User, {
  foreignKey: "userId",
  constraints: false,
  foreignKeyConstraint: true,
});
User.hasMany(Posts, { foreignKey: "userId" });

Posts.belongsTo(Category, {
  foreignKey: "categoryId",
  constraints: false,
  foreignKeyConstraint: true,
});
Category.hasMany(Posts, { foreignKey: "categoryId" });

module.exports = Posts;
