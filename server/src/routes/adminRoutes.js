const express = require("express");
const router = express.Router();
const adminAuthenticate = require("../middleware/adminAuth");
const { getSummary } = require("../controllers/adminController");

router.get("/summary", adminAuthenticate, getSummary);

module.exports = router;
