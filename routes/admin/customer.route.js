const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const controller = require("../../controllers/admin/customer.controller");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");

router.get("/", controller.index);
router.get("/detail/:id", controller.detail);
router.get("/edit/:id", controller.edit);
router.patch("/edit/:id", upload.single("avatar"), uploadCloud.upload, controller.editPatch);
router.patch("/change-status/:status/:id", controller.changeStatus);
router.patch("/change-multi", controller.changeMulti);
router.delete("/delete/:id", controller.deleteItem);

module.exports = router;
