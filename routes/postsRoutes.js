const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken"); // Add this line
const Post = require("../models/posts");

// Create a new post
router.post("/addPosts", async (req, res) => {
  const { name, description, price, img_url, lat, lon, id_cat, is_available } =
    req.body;

  try {
    // Extract id_user from the JWT token
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.decode(token);

    // Log the decoded token for debugging
    console.log("Decoded Token:", decodedToken);

    const newPost = await Post.create({
      id: uuidv4(),
      name,
      description,
      price,
      img_url,
      lat,
      lon,
      id_cat,
      id_user: decodedToken.id,
      is_available,
    });

    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Error creating post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/allPosts", async (req, res) => {
  try {
    const allPosts = await Post.findAll();
    res.status(200).json({ posts: allPosts });
  } catch (error) {
    console.error("Error fetching posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    // Extract id_user from the JWT token
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.decode(token);

    // Log the decoded token for debugging
    console.log("Decoded Token:", decodedToken);

    const userPosts = await Post.findAll({
      where: { id_user: decodedToken.id },
    });

    res.status(200).json({ posts: userPosts });
  } catch (error) {
    console.error("Error fetching user posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
