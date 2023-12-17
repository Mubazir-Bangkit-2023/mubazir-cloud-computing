const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Post = require("../models/posts");
const Category = require("../models/category");
const User = require("../models/user");
const ImgUpload = require("../config/imgUploadedGcs");
const { Op } = require("sequelize");
const moment = require("moment");
const geolib = require("geolib");

const { invalidatedTokens } = require("./auth");
const authMiddleware = require("./authMiddleware");

router.get("/posts", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      lat,
      lon,
      search,
      category,
      radius,
      price,
    } = req.query;
    const offset = (page - 1) * limit;

    const userLocation = {};

    if (lat) {
      userLocation.latitude = parseFloat(lat);
    }

    if (lon) {
      userLocation.longitude = parseFloat(lon);
    }

    let whereCondition = {};

    if (search) {
      whereCondition = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { price: { [Op.like]: `%${search}%` } },
        ],
      };
    }
    if (category) {
      whereCondition.categoryId = category;
    }
    if (price) {
      whereCondition.price = { [Op.lte]: parseFloat(price) };
    }

    const posts = await Post.findAll({ where: whereCondition });

    const WithDistanceAndDistance = posts
      .map((post) => {
        const locationPosts = {
          latitude: parseFloat(post.lat),
          longitude: parseFloat(post.lon),
        };

        const distance =
          userLocation.latitude && userLocation.longitude
            ? geolib.getDistance(userLocation, locationPosts)
            : null;

        const pickupTimeUnix = moment(post.pickupTime).unix();
        const createdAtUnix = moment(post.createdAt).unix();
        const updateAtUnix = moment(post.updatedAt).unix();

        const postResponses = {
          ...post.dataValues,
          pickupTime: pickupTimeUnix,
          createdAt: createdAtUnix,
          updatedAt: updateAtUnix,
          distance,
        };

        return postResponses;
      })
      .filter((post) => {
        // Filter posts based on the specified radius
        return (
          !radius || (post.distance && post.distance <= parseFloat(radius))
        );
      });

    let sortPost;

    if (search || category || price || (lat && lon)) {
      sortPost = WithDistanceAndDistance;
    } else {
      sortPost = WithDistanceAndDistance.sort(
        (a, b) => b.createdAt - a.createdAt
      );
    }

    if (radius && userLocation.latitude && userLocation.longitude) {
      // Sort based on distance if radius filter is applied
      sortPost.sort((a, b) => a.distance - b.distance);
    }

    const pagePost = sortPost.slice(offset, offset + parseInt(limit));
    res.status(200).json({ posts: pagePost, page, limit });
  } catch (error) {
    console.error("Error fetching posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const latestPosts = await Post.findAll({
      order: [["createdAt", "DESC"]],
    });

    const postsWithUnixTimestamps = latestPosts.map((post) => {
      const pickupTimeUnix = moment(post.pickupTime).unix();
      const createdAtUnix = moment(post.createdAt).unix();
      const updateAtUnix = moment(post.updatedAt).unix();

      return {
        ...post.dataValues,
        pickupTime: pickupTimeUnix,
        createdAt: createdAtUnix,
        updatedAt: updateAtUnix,
      };
    });

    res.status(200).json({ posts: postsWithUnixTimestamps });
  } catch (error) {
    console.error("Error fetching latest posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ["id", "fullname", "email", "no_hp", "photo_url"],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const pickupTimeUnix = moment(post.pickupTime).unix();
    const createdAtUnix = moment(post.createdAt).unix();
    const updateAtUnix = moment(post.updatedAt).unix();

    const postResponses = {
      ...post.toJSON(),
      pickupTime: pickupTimeUnix,
      createdAt: createdAtUnix,
      updatedAt: updateAtUnix,
    };

    res.status(200).json(postResponses);
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

router.get("/recommendation/nearby", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }
    const userLocation = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const allPosts = await Post.findAll();
    const WithDistance = allPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(userLocation, locationPosts, 1);
      const pickupTimeUnix = moment(post.pickupTime).unix();
      const createdAtUnix = moment(post.createdAt).unix();
      const updateAtUnix = moment(post.updatedAt).unix();

      const postResponses = {
        ...post.dataValues,
        pickupTime: pickupTimeUnix,
        createdAt: createdAtUnix,
        updatedAt: updateAtUnix,
        distance,
      };

      return postResponses;
    });
    const sortPosts = WithDistance.sort((a, b) => a.distance - b.distance);
    const nearbyPosts = sortPosts.slice(0, 5);
    res.status(200).json({ posts: nearbyPosts });
  } catch (error) {
    console.error("Error fetching nearby recommendations", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/recommendation/restaurant", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }

    const userLocation = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };

    const restaurantPosts = await Post.findAll({
      where: {
        categoryId: 1,
      },
    });
    const restaurantWithDistance = restaurantPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(userLocation, locationPosts, 1);

      const pickupTimeUnix = moment(post.pickupTime).unix();
      const createdAtUnix = moment(post.createdAt).unix();
      const updateAtUnix = moment(post.updatedAt).unix();

      const restaurantResponsePost = {
        ...post.dataValues,
        pickupTime: pickupTimeUnix,
        createdAt: createdAtUnix,
        updatedAt: updateAtUnix,
        distance,
      };

      return restaurantResponsePost;
    });

    const restaurantSort = restaurantWithDistance.sort(
      (a, b) => a.distance - b.distance
    );

    const restaurantPost = restaurantSort.slice(0, 5);
    res.status(200).json({ restaurants: restaurantPost });
  } catch (error) {
    console.error("Error fetching nearby restaurant recommendations", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/recommendation/homefood", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }
    const userLocation = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const rawIngredientsPosts = await Post.findAll({
      where: {
        categoryId: 2,
      },
    });
    const withDistance = rawIngredientsPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(userLocation, locationPosts, 1);

      // Convert timestamps to Unix format
      const pickupTimeUnix = moment(post.pickupTime).unix();
      const createdAtUnix = moment(post.createdAt).unix();
      const updateAtUnix = moment(post.updatedAt).unix();

      // Create the response object with Unix timestamps and distance
      const responseHomefoodPost = {
        ...post.dataValues,
        pickupTime: pickupTimeUnix,
        createdAt: createdAtUnix,
        updatedAt: updateAtUnix,
        distance,
      };

      return responseHomefoodPost;
    });

    // Sort by distance after timestamp conversion
    const sortHomefood = withDistance.sort((a, b) => a.distance - b.distance);

    const homefoodPost = sortHomefood.slice(0, 5);
    res.status(200).json({ homefood: homefoodPost });
  } catch (error) {
    console.error("Error fetching nearby homefood recommendations", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/recommendation/rawIngredients", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }
    const userLocation = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const rawIngredientsPosts = await Post.findAll({
      where: {
        categoryId: 3, // Category ID for "raw ingredients"
      },
    });
    const withDistance = rawIngredientsPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(userLocation, locationPosts, 1);

      // Convert timestamps to Unix format
      const pickupTimeUnix = moment(post.pickupTime).unix();
      const createdAtUnix = moment(post.createdAt).unix();
      const updateAtUnix = moment(post.updatedAt).unix();

      // Create the response object with Unix timestamps and distance
      const responseRawIngredientsPost = {
        ...post.dataValues,
        pickupTime: pickupTimeUnix,
        createdAt: createdAtUnix,
        updatedAt: updateAtUnix,
        distance,
      };

      return responseRawIngredientsPost;
    });

    // Sort by distance after timestamp conversion
    const sort = withDistance.sort((a, b) => a.distance - b.distance);

    const rawIngredientsPost = sort.slice(0, 5);
    res.status(200).json({ raw_ingredients: rawIngredientsPost });
  } catch (error) {
    console.error(
      "Error fetching nearby raw ingredients recommendations",
      error
    );
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/user/posts",
  authMiddleware.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.authData.id;

      const posts = await Post.findAll({
        where: { userId },
        include: [
          {
            model: User,
            attributes: ["id", "fullname", "email", "no_hp", "photo_url"],
          },
        ],
      });

      const postsWithUnixTimestamps = posts.map((post) => {
        const pickupTimeUnix = moment(post.pickupTime).unix();
        const createdAtUnix = moment(post.createdAt).unix();
        const updateAtUnix = moment(post.updatedAt).unix();

        return {
          ...post.dataValues,
          pickupTime: pickupTimeUnix,
          createdAt: createdAtUnix,
          updatedAt: updateAtUnix,
        };
      });

      res.status(200).json({ posts: postsWithUnixTimestamps });
    } catch (error) {
      console.error("Error fetching user posts", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

//Post Routes
router.post(
  "/posts/food",
  ImgUpload.uploadToGcs,
  ImgUpload.handleUpload,
  authMiddleware.authenticateToken,
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
      const tokenDecode = req.authData;
      const categoryExists = await Category.findByPk(categoryId);

      if (!categoryExists) {
        return res.status(404).json({ message: "Category not found" });
      }

      let imageUrl = "";
      if (req.file && req.file.cloudStoragePublicUrl) {
        imageUrl = req.file.cloudStoragePublicUrl;
      }

      let formatDateTime = "";
      let numericDateTime = 0;
      try {
        const datetime = moment.unix(pickupTime);
        formatDateTime = datetime.format("YYYY-MM-DD HH:mm:ss");
        numericDateTime = datetime.unix();
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
        userId: tokenDecode.id,
        isAvailable: isAvailable || true,
      });

      res
        .status(201)
        .json({ message: "Post created successfully", post: newPost });
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
    const postId = req.params.id;
    try {
      const post = await Post.findByPk(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const tokenDecode = req.authData;

      if (!tokenDecode.id) {
        return res
          .status(401)
          .json({ message: "Unauthorized: User not logged in" });
      }
      if (tokenDecode.id !== post.userId) {
        return res.status(403).json({
          message:
            "Forbidden: User does not have permission to update this post",
        });
      }

      const {
        title,
        description,
        price,
        lat,
        lon,
        freshness,
        categoryId,
        isAvailable,
        pickupTime,
      } = req.body;

      if (!pickupTime) {
        return res.status(400).json({ message: "pickupTime is required" });
      }

      let formatDateTime = "";
      try {
        const datetime = moment.unix(pickupTime);
        formatDateTime = datetime.format("YYYY-MM-DD HH:mm:ss");
      } catch (error) {
        console.error("Error converting pickupTime:", error);
        return res.status(400).json({ message: "Invalid pickupTime format" });
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
      const token =
        req.headers["authorization"] &&
        req.headers["authorization"].split(" ")[1];

      if (invalidatedTokens && invalidatedTokens.has(token)) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Token invalidated" });
      }
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  }
);

//Delete Routes
router.delete("/deletePost/:id", async (req, res) => {
  try {
    const tokenDecode = req.authData;
    const deletedPost = await Post.destroy({
      where: {
        id: req.params.id,
        userId: tokenDecode.id,
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

//update user
router.put(
  "/updateUser",
  authMiddleware.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.authData.id;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { fullname, no_hp, email, newPassword, photo_url } = req.body;
      if (fullname) {
        user.fullname = fullname;
      }
      if (no_hp) {
        user.no_hp = no_hp;
      }

      if (email) {
        const emailTaken = await User.findOne({
          where: { email, id: { [Op.not]: userId } },
        });

        if (emailTaken) {
          return res.status(400).json({ message: "Email is already taken" });
        }

        user.email = email;
      }

      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
      }
      if (photo_url) {
        user.photo_url = photo_url;
      }
      await user.save();

      res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
      console.error("Error updating user", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

module.exports = router;
