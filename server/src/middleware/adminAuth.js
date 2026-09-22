const adminAuthenticate = (req, res, next) => {
  const adminKey = req.header("x-admin-key");

  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing admin key" });
  }

  next();
};

module.exports = adminAuthenticate;
