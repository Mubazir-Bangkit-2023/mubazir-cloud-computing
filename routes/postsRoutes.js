const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Post = require("../models/posts");
const ImgUpload = require("../config/imgUploadedGcs");
const bcrypt = require("bcryptjs");

router.post(
  "/addPosts/:id_user",
  ImgUpload.uploadToGcs,
  ImgUpload.handleUpload,
  async (req, res) => {
    const { name, description, price, lat, lon, id_cat, is_available } =
      req.body;

    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing token" });
      }

      try {
        // Verify the token
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

        console.log("Decoded Token:", decodedToken);

        // Check if the id_user in the route matches the id_user in the token
        if (decodedToken.id !== req.params.id_user) {
          return res.status(403).json({ message: "Forbidden: User mismatch" });
        }

        // Check if the category with the given id_cat exists
        const categoryExists = await Category.findByPk(id_cat);
        if (!categoryExists) {
          return res.status(404).json({ message: "Category not found" });
        }

        let imageUrl = "";
        if (req.file && req.file.cloudStoragePublicUrl) {
          imageUrl = req.file.cloudStoragePublicUrl;
        }

        const newPost = await Post.create({
          id: uuidv4(),
          name,
          description,
          price,
          img_url: imageUrl,
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
        // Token is invalid
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
    } catch (error) {
      console.error("Error creating post", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/All", async (req, res) => {
  try {
    const allPosts = await Post.findAll();
    res.status(200).json({ posts: allPosts });
  } catch (error) {
    console.error("Error fetching posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users:id_users", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.decode(token);

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

router.put("/updatePost/:post_id", async (req, res) => {
  const { name, description, price, lat, lon, id_cat, is_available } = req.body;

  try {
    const updatedPost = await Post.update(
      {
        name,
        description,
        price,
        lat,
        lon,
        id_cat,
        is_available,
      },
      {
        where: {
          id: req.params.post_id,
        },
      }
    );

    if (updatedPost[0] === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a post by ID
router.delete("/deletePost/:post_id", async (req, res) => {
  try {
    const deletedPost = await Post.destroy({
      where: {
        id: req.params.post_id,
      },
    });

    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get a single post by ID
router.get("/getPost/:post_id", async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.post_id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ post });
  } catch (error) {
    console.error("Error fetching post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
