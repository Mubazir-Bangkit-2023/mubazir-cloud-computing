// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  dialect: "mysql",
  host: DB_HOST,
  timestamps: false,
  dialectoptions: {
    socketpath: "/cloudsql/capstone-project-mubazirapp:asia-southeast2:mubazir",
  },
});

module.exports = sequelize;
