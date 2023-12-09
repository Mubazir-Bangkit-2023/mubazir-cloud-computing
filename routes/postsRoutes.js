const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Post = require("../models/posts");
const Category = require("../models/category");
const ImgUpload = require("../config/imgUploadedGcs");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const { Op } = require("sequelize");

const { invalidatedTokens } = require("./auth");

//Get Routes
router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.get("/Category/:categoryId", async (req, res) => {
  try {
    const id_cat = req.params.categoryId;
    const postsByCategory = await Post.findAll({
      where: {
        categoryId: id_cat,
      },
    });
    res.status(200).json({ posts: postsByCategory });
  } catch (error) {
    console.error("Error fetching posts by category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/filterByTitle", async (req, res) => {
  try {
    const titleFilter = req.query.title;

    if (!titleFilter) {
      return res.status(400).json({ message: "Missing title parameter" });
    }

    const filteredPosts = await Post.findAll({
      where: {
        title: {
          [Op.iLike]: `%${titleFilter}%`, // Gunakan Op.iLike untuk pencarian case-insensitive
        },
      },
    });

    if (filteredPosts.length === 0) {
      return res
        .status(404)
        .json({ message: "No posts found with the specified title" });
    }

    res.status(200).json({ posts: filteredPosts });
  } catch (error) {
    console.error("Error fetching posts by title", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Post Routes
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

        let formatDateTime = "";

        try {
          const datetime = moment.unix(pickupTime);
          formatDateTime = datetime.format("YYYY-MM-DD HH:mm:ss");
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

//Put Routes
router.put(
  "/postsUpdate/:id",
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
    const postId = req.params.id;
    try {
      const post = await Post.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
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
        if (decodedToken.id !== post.userId) {
          return res.status(403).json({
            message:
              "Forbidden: User does not have permission to update this post",
          });
        }
        let formatDateTime = "";
        try {
          const datetime = moment.unix(pickupTime);
          formatDateTime = datetime.format("YYYY-MM-DD HH:mm:ss");
        } catch (error) {
          console.error("Error converting pickupTime:", error);
        }
        post.title = title;
        post.description = description;
        post.price = price;
        post.pickupTime = formatDateTime;
        post.lat = lat;
        post.lon = lon;
        post.freshness = freshness;
        post.categoryId = categoryId;
        post.isAvailable = isAvailable;
        if (req.file && req.file.cloudStoragePublicUrl) {
          post.imgUrl = req.file.cloudStoragePublicUrl;
        }
        await post.save();
        res.status(200).json({ message: "Post updated successfully", post });
      } catch (error) {
        console.error("Error updating post", error);
        if (invalidatedTokens && invalidatedTokens.has(token)) {
          return res
            .status(401)
            .json({ message: "Unauthorized: Token invalidated" });
        }
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
    } catch (error) {
      console.error("Error updating post", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

//Delete Routes
router.delete("/deletePost/:id", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Decoded Token:", decodedToken);
    const deletedPost = await Post.destroy({
      where: {
        id: req.params.id,
        userId: decodedToken.id,
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

module.exports = router;
