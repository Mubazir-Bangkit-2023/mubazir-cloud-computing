const { Sequelize } = require("sequelize");

// Load environment variables from a .env file
require("dotenv").config();

// Get environment variables or use default values
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_DIALECT = process.env.DB_DIALECT;
// const DB_SOCKET_PATH = process.env.DB_SOCKET_PATH;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  dialect: process.env.DB_DIALECT,
  host: DB_HOST,
});

module.exports = sequelize;
