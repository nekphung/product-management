const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/product.controller");

router.get("/", controller.index);

router.get("/:slugCategory", controller.category);

router.get("/detail/:slugProduct", controller.detail);

// Bên kia sẽ dùng nối chuỗi với cái này để có được nhiều cái endpoints
module.exports = router;

