const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const { getMyDashboard } = require("../controllers/dashboardController");
const { getInvoice } = require("../controllers/invoiceController");

router.get("/", authenticate, getMyDashboard);
router.get("/invoice", authenticate, getInvoice);

module.exports = router;
