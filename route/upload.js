const express = require('express');
const { uploadFile } = require('../controller/upload');
const router = express.Router();



// POST /example
router.post('/', uploadFile);

module.exports = router;