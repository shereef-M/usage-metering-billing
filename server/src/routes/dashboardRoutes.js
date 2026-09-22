const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const { getMyDashboard } = require("../controllers/dashboardController");

router.get("/", authenticate, getMyDashboard);

module.exports = router;
