const systemConfig = require("../../config/system");

const authMiddleware = require("../../middlewares/admin/auth.middleware");
const settingMiddleware = require("../../middlewares/client/setting.middleware");

const authRoutes = require("./auth.route");
const dashboardRoutes = require("./dashboard.route");
const productRoutes = require("./product.route");
const productCategoryRoutes = require("./products-category.route");
const roleRoutes = require("./role.route");
const accountRoutes = require("./account.route");
const myAccountRoutes = require("./my-account.route");
const settingRoutes = require("./setting.route");
const orderRoutes = require("./order.route");
const customerRoutes = require("./customer.route");
const stockWaitlistRoutes = require("./stock-waitlist.route");

module.exports = (app) => {
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(PATH_ADMIN, settingMiddleware.settingGeneral);

    app.use(PATH_ADMIN + "/auth", authRoutes);

    app.use(PATH_ADMIN + "/dashboard", 
        authMiddleware.requireAuth,
        dashboardRoutes
    );

    app.use(PATH_ADMIN + "/products", 
        authMiddleware.requireAuth, 
        productRoutes
    );

    app.use(PATH_ADMIN + "/products-category", 
        authMiddleware.requireAuth, 
        productCategoryRoutes
    );

    app.use(PATH_ADMIN + "/roles",
        authMiddleware.requireAuth, 
        roleRoutes
    );

    app.use(PATH_ADMIN + "/accounts", 
        authMiddleware.requireAuth, 
        accountRoutes
    );

    app.use(PATH_ADMIN + "/my-account", 
        authMiddleware.requireAuth, 
        myAccountRoutes
    );

    app.use(PATH_ADMIN + "/settings", 
        authMiddleware.requireAuth, 
        settingRoutes
    );

    app.use(PATH_ADMIN + "/orders", 
        authMiddleware.requireAuth,
        orderRoutes
    );

    app.use(PATH_ADMIN + "/customers",
        authMiddleware.requireAuth,
        customerRoutes
    );

    app.use(PATH_ADMIN + "/stock-waitlist",
        authMiddleware.requireAuth,
        stockWaitlistRoutes
    );

    // Admin-only fallback: keep unknown admin URLs inside the admin shell.
    app.use(PATH_ADMIN, authMiddleware.requireAuth, (req, res) => {
        res.status(404).render("admin/pages/errors/404", {
            pageTitle: "Không tìm thấy trang quản trị"
        });
    });
}
