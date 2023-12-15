const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const headerAuth = req.headers["authorization"];
  const token = headerAuth && headerAuth.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken,
};
