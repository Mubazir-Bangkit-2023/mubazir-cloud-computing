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

//Get Routes posts
router.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 10, lat, lon } = req.query;
    const offset = (page - 1) * limit;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }

    const location_user = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };

    const posts = await Post.findAll();

    const WithDistanceAndDistance = posts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(location_user, locationPosts, 1);
      const createdAtTimestamp = new Date(post.createdAt).getTime();
      return { ...post.dataValues, distance, createdAtTimestamp };
    });
    const sortPosts = WithDistanceAndDistance.sort((a, b) => {
      if (a.distance === b.distance) {
        return b.createdAtTimestamp - a.createdAtTimestamp;
      }
      return a.distance - b.distance;
    });

    const paginatedPosts = sortPosts.slice(offset, offset + parseInt(limit));

    res.status(200).json({ posts: paginatedPosts, page, limit });
  } catch (error) {
    console.error("Error fetching all posts", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     const allPosts = await Post.findAll();
//     res.status(200).json({ posts: allPosts });
//   } catch (error) {
//     console.error("Error fetching all posts", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.get("/latest", async (req, res) => {
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

    const unixPickupTime = moment(post.pickupTime).unix();
    const unixCreatedAt = moment(post.createdAt).unix();
    const unixUpdatedAt = moment(post.updatedAt).unix();

    const responsePost = {
      ...post.toJSON(),
      pickupTime: unixPickupTime,
      createdAt: unixCreatedAt,
      updatedAt: unixUpdatedAt,
    };

    res.status(200).json(responsePost);
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
          [Op.iLike]: `%${titleFilter}%`,
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

router.get("/recommendation/nearby", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ message: "Missing latitude or longitude parameters" });
    }
    const location_user = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const allPosts = await Post.findAll();
    const WithDistance = allPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(location_user, locationPosts, 1);
      return { ...post.dataValues, distance };
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

    const location_user = {
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
      const distance = geolib.getDistance(location_user, locationPosts, 1);
      const differenceLat = Math.abs(
        location_user.latitude - locationPosts.latitude
      );
      const differenceLon = Math.abs(
        location_user.longitude - locationPosts.longitude
      );

      return {
        ...post.dataValues,
        distance,
        latUser: location_user.latitude,
        userLon: location_user.longitude,
        latPost: locationPosts.latitude,
        lonPost: locationPosts.longitude,
        differenceLat,
        differenceLon,
      };
    });
    const sortedRestaurants = restaurantWithDistance.sort(
      (a, b) => a.distance - b.distance
    );

    const restaurantPost = sortedRestaurants.slice(0, 5);
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
    const location_user = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const homefoodPosts = await Post.findAll({
      where: {
        categoryId: 2,
      },
    });
    const homefoodWithDistance = homefoodPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(location_user, locationPosts, 1);
      const differenceLat = Math.abs(
        location_user.latitude - locationPosts.latitude
      );
      const differenceLon = Math.abs(
        location_user.longitude - locationPosts.longitude
      );
      return {
        ...post.dataValues,
        distance,
        latUser: location_user.latitude,
        lonUser: location_user.longitude,
        latPost: locationPosts.latitude,
        lonPost: locationPosts.longitude,
        differenceLat,
        differenceLon,
      };
    });
    const sortHomefood = homefoodWithDistance.sort(
      (a, b) => a.distance - b.distance
    );
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
    const location_user = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
    };
    const ingredientsPosts = await Post.findAll({
      where: {
        categoryId: 3,
      },
    });
    const ingredientsWithDistance = ingredientsPosts.map((post) => {
      const locationPosts = {
        latitude: parseFloat(post.lat),
        longitude: parseFloat(post.lon),
      };
      const distance = geolib.getDistance(location_user, locationPosts, 1);
      const differenceLat = Math.abs(
        location_user.latitude - locationPosts.latitude
      );
      const differenceLon = Math.abs(
        location_user.longitude - locationPosts.longitude
      );
      return {
        ...post.dataValues,
        distance,
        latUser: location_user.latitude,
        lonUser: location_user.longitude,
        latPost: locationPosts.latitude,
        lonPost: locationPosts.longitude,
        differenceLat,
        differenceLon,
      };
    });
    const sortedIngredients = ingredientsWithDistance.sort(
      (a, b) => a.distance - b.distance
    );
    const ingredientsPost = sortedIngredients.slice(0, 5);
    res.status(200).json({ rawIngredients: ingredientsPost });
  } catch (error) {
    console.error("Error fetching nearby homefood recommendations", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Post Routes
router.post(
  "/posts/food",
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
      const headerAuth = req.headers["authorization"];
      const token = headerAuth && headerAuth.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing token" });
      }
      try {
        const tokenDecode = jwt.verify(token, process.env.SECRET_KEY);
        console.log("Decoded Token:", tokenDecode);
        if (!tokenDecode.id) {
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
      const headerAuth = req.headers["authorization"];
      const token = headerAuth && headerAuth.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing token" });
      }

      try {
        const tokenDecode = jwt.verify(token, process.env.SECRET_KEY);
        console.log("Decoded Token:", tokenDecode);

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
    const headerAuth = req.headers["authorization"];
    const token = headerAuth && headerAuth.split(" ")[1];
    const tokenDecode = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Decoded Token:", tokenDecode);
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

module.exports = router;
