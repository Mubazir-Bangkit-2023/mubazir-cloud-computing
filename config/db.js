// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const DB_NAME = process.ENV.DB_NAME;
const DB_USER = process.ENV.DB_USER;
const DB_PASSWORD = process.ENV.DB_PASSWORD;
const DB_HOST = process.ENV.DB_HOST;
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  dialect: "mysql",
  host: DB_HOST,
  timestamps: false,
  dialectoptions: {
    socketpath: "/cloudsql/capstone-project-mubazirapp:asia-southeast2:mubazir",
  },
});

module.exports = sequelize;
