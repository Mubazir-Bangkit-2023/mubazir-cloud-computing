const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
const sequelize = require("./config/db");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/postsRoutes");
const CategoriesRoutes = require("./routes/categoryRoutes");

const app = express();
const port = process.ENV.PORT;
const sessionSecret = process.ENV.SECRET_KEY;

sequelize
  .sync()
  .then(() => {
    console.log("Database and tables synced");
  })
  .catch((err) => {
    console.error("Error syncing database", err);
  });

app.use(bodyParser.json());
app.use(
  session({ secret: sessionSecret, resave: true, saveUninitialized: true })
);
app.use(cors());

app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);
app.use("/categories", CategoriesRoutes);

app.get("/allUsers", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
