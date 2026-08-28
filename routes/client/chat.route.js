const express = require("express");
const controller = require("../../controllers/client/chat.controller");

const router = express.Router();

router.post("/", controller.reply);

module.exports = router;
