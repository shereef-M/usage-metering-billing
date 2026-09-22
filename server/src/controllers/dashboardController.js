const { getDashboard } = require('../services/dashboardService');

const getMyDashboard = async (req, res) => {
  try {
    const dashboard = await getDashboard(req.user);
    res.json(dashboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMyDashboard };