const { getAdminSummary } = require("../services/adminService");

const getSummary = async (req, res) => {
  try {
    const summary = await getAdminSummary();
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getSummary };
