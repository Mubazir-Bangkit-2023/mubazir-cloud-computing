const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();
const invalidatedTokens = new Set();

router.post("/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "Semua field harus diisi!" });
    }

    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email Sudah ada!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      fullname: fullname,
      email: email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "Registrasi User Sukses!" });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors.map((err) => ({
        message: err.message,
        field: err.path,
      }));
      return res
        .status(400)
        .json({ message: "Validasi Error", errors: validationErrors });
    }

    console.error(error);
    res.status(500).json({ message: "Server Error" });
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
      process.env.SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );
    res.json({
      message: "Login successful",
      data: {
        userId: user.id,
        token: token,
      },
    });
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

  if (invalidatedTokens.has(token)) {
    res.status(401).json({ message: "Unauthorized: Token invalidated" });
    return;
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decodedToken) => {
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

router.post("/logout", (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    invalidatedTokens.add(token);
    res.json({ message: "Logout successful" });
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
});

module.exports = router;
