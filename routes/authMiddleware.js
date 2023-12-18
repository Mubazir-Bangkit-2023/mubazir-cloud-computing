const jwt = require("jsonwebtoken");
const { invalidatedTokens } = require("./auth");

const authenticateToken = (req, res, next) => {
  const headerAuth = req.headers["authorization"];
  const token = headerAuth && headerAuth.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Pastikan properti yang Anda periksa ada dalam payload token
    if (!decodedToken || !decodedToken.hasOwnProperty("id")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not logged in" });
    }

    if (invalidatedTokens && invalidatedTokens.has(token)) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token invalidated" });
    }

    req.authData = decodedToken;
    next();
  } catch (error) {
    console.error("Error decoding token:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = { authenticateToken };
