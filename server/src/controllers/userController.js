const User = require("../models/User");

const createUser = async (req, res) => {
  try {
    const { name, email, tier } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const apiKey = User.generateApiKey();

    const user = await User.create({
      name,
      email,
      apiKey,
      tier: tier || "free",
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      apiKey: user.apiKey, // shown once at creation, like real API providers
      tier: user.tier,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email or API key already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createUser };
