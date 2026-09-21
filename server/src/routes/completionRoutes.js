const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createCompletion } = require('../controllers/completionController');

router.post('/', authenticate, createCompletion);

module.exports = router;