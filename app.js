const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const sequelize = require("./config/db");
const User = require("./models/user");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/postsRoutes");

const app = express();
const port = process.env.PORT;
const sessionSecret = process.env.SESSION_SECRET;

// Sync the models with the database
sequelize
  .sync()
  .then(() => {
    console.log("Database and tables synced");
  })
  .catch((err) => {
    console.error("Error syncing database", err);
  });

// Middleware
app.use(bodyParser.json());
app.use(
  session({ secret: sessionSecret, resave: true, saveUninitialized: true })
);
app.use(helmet()); // Menggunakan Helmet untuk keamanan

app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);

app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running`);
});
