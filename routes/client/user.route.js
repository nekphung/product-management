const express = require("express");
const router = express.Router();
const multer = require("multer");
const storageMulter = require("../../helpers/storageMulter");
// const upload = multer({ storage: storageMulter() });

const upload = multer();
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");

const validate = require("../../validates/client/user.validate");

const controller = require("../../controllers/client/user.controller");

router.get("/register", controller.register);

router.post("/register", validate.registerPost, controller.registerPost);

router.get("/login", controller.login);

router.post("/login", validate.loginPost, controller.loginPost);

router.get("/logout", controller.logout);

router.get("/password/forgot", controller.forgotPassword);

router.post("/password/forgot", validate.forgotPasswordPost, controller.forgotPasswordPost);

router.get("/password/otp", controller.otpPassword);

router.post("/password/otp", controller.otpPasswordPost);

router.get("/info/edit", controller.infoEdit);

router.patch("/info/edit", 
    upload.single("avatar"),
    uploadCloud.upload,
    controller.infoEditPatch
);

router.get("/info", controller.info);

module.exports = router;
