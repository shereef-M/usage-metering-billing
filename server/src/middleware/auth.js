const User = require("../models/User");

const authenticate = async (req, res, next) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res.status(401).json({ error: "API key missing" });
  }

  const user = await User.findOne({ apiKey, isActive: true });

  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  req.user = user;
  next();
};

module.exports = authenticate;
