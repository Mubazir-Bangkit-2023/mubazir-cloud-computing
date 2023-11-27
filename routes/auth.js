const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, fullname, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      fullname,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      "your-secret-key",
      {
        expiresIn: "1h",
      }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error during login", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/protected", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing token" });
    return;
  }

  jwt.verify(token, "your-secret-key", (err, decodedToken) => {
    if (err) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    const userId = decodedToken.id;

    User.findOne({ where: { id: userId } })
      .then((user) => {
        if (!user) {
          res.status(401).json({ message: "Unauthorized: User not found" });
          return;
        }

        res.send(`Welcome ${user.username}!`);
      })
      .catch((err) => {
        console.error("Error fetching user", err);
        res.status(500).json({ message: "Internal server error" });
      });
  });
});

module.exports = router;
