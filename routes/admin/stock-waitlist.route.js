const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/stock-waitlist.controller");

router.get("/", controller.index);
router.patch("/:id/status", controller.changeStatus);
router.delete("/:id", controller.deleteItem);

module.exports = router;
