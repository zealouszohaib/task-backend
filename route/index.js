const router = require("express").Router();
const uploadRouter = require('./upload');
router.use('/upload',uploadRouter);

module.exports = router;

