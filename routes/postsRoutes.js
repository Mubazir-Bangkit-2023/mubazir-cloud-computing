const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Post = require("../models/posts");
const Category = require("../models/category");
const ImgUpload = require("../config/imgUploadedGcs");
const bcrypt = require("bcryptjs");
const moment = require("moment");

const { invalidatedTokens } = require("./auth");

router.post(
  "/food",
  ImgUpload.uploadToGcs,
  ImgUpload.handleUpload,
  async (req, res) => {
    const {
      title,
      description,
      price,
      pickupTime,
      lat,
      lon,
      freshness,
      categoryId,
      isAvailable,
    } = req.body;
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing token" });
      }

      try {
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
        console.log("Decoded Token:", decodedToken);

        if (!decodedToken.id) {
          return res
            .status(401)
            .json({ message: "Unauthorized: User not logged in" });
        }
        if (invalidatedTokens && invalidatedTokens.has(token)) {
          return res
            .status(401)
            .json({ message: "Unauthorized: Token invalidated" });
        }
        const categoryExists = await Category.findByPk(categoryId);
        if (!categoryExists) {
          return res.status(404).json({ message: "Category not found" });
        }
        let imageUrl = "";
        if (req.file && req.file.cloudStoragePublicUrl) {
          imageUrl = req.file.cloudStoragePublicUrl;
        }

        let formatDateTime;

        try {
          const datetime = moment.unix(pickupTime);
          const formatDateTime = datetime.format("YYYY-MM-DD HH:mm:ss");
        } catch (error) {
          console.error("Error converting pickupTime:", error);
        }

        const newPost = await Post.create({
          id: uuidv4(),
          title,
          description,
          price,
          pickupTime: formatDateTime,
          imgUrl: imageUrl,
          freshness,
          lat,
          lon,
          categoryId,
          userId: decodedToken.id,
          isAvailable: isAvailable || true,
        });
        res
          .status(201)
          .json({ message: "Post created successfully", post: newPost });
      } catch (error) {
        if (invalidatedTokens && invalidatedTokens.has(token)) {
          return res
            .status(401)
            .json({ message: "Unauthorized: Token invalidated" });
        }
        console.error("Error creating post", error);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
    } catch (error) {
      console.error("Error creating post", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/all", async (req, res) => {
  try {
    const allPosts = await Post.findAll();
    res.status(200).json({ posts: allPosts });
  } catch (error) {
    console.error("Error fetching posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/latestPosts", async (req, res) => {
  try {
    const latestPosts = await Post.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ posts: latestPosts });
  } catch (error) {
    console.error("Error fetching latest posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/updatePost/:id", async (req, res) => {
  const { title, description, price, lat, lon, id_cat, is_available } =
    req.body;

  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Decoded Token:", decodedToken);

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
          id: req.params.id,
          id_user: decodedToken.id,
        },
      }
    );

    if (updatedPost[0] === 0) {
      return res
        .status(404)
        .json({ message: "Post not found or unauthorized" });
    }

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/deletePost/:id", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Decoded Token:", decodedToken);

    const deletedPost = await Post.destroy({
      where: {
        id: req.params.id,
        id_user: decodedToken.id,
      },
    });

    if (!deletedPost) {
      return res
        .status(404)
        .json({ message: "Post not found or unauthorized" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getPost/:id", async (req, res) => {
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

router.get("/postsByCategory/:id_cat", async (req, res) => {
  try {
    const id_cat = req.params.id_cat;
    const postsByCategory = await Post.findAll({
      where: {
        id_cat: id_cat,
      },
    });
    res.status(200).json({ posts: postsByCategory });
  } catch (error) {
    console.error("Error fetching posts by category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
