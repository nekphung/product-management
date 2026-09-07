const router = require("express").Router();
const controller = require("../../controllers/client/coupon.controller");
const auth = require("../../middlewares/client/auth.middleware");
router.get("/", controller.index);
router.get("/wallet", auth.requireAuth, controller.wallet);
router.post("/:id/collect", auth.requireAuth, controller.collect);
module.exports = router;
