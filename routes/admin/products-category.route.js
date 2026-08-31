const express = require("express");
const router = express.Router();
const multer = require("multer");

const controller = require("../../controllers/admin/products-category.controller");
const upload = multer();
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
const validate = require("../../validates/admin/products-category.validate");

router.get("/", controller.index);

router.get("/detail/:id", controller.detail);

router.get("/create", controller.create);

router.post(
    "/create", 
    upload.single("thumbnail"),
    uploadCloud.upload,
    validate.createPost,
    controller.createPost
)

router.get("/edit/:id", controller.edit);

router.patch(
    "/edit/:id", 
    upload.single("thumbnail"),
     uploadCloud.upload,
    validate.createPost,
    controller.editPatch
);

router.patch("/change-multi", controller.changeMulti);

router.delete("/delete/:id", controller.deleteItem);

module.exports = router;
