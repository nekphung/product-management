const md5 = require("md5");
const mongoose = require("mongoose");
const User = require("../../models/user.model");
const ForgotPassword = require("../../models/forgot-password.model");
const Cart = require("../../models/cart.model");
const Order = require("../../models/order.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
const { ORDER_STATUSES, getOrderStatus } = require("../../helpers/orderStatus");
const inventoryHelper = require("../../helpers/inventory");

const generateHelper = require("../../helpers/generate");
const sendMailHelper = require("../../helpers/sendMail");

// [GET] /user/register
module.exports.register = async (req, res) => {
    
    res.render("client/pages/user/register", {
        pageTitle: "Đăng ký tài khoản"
    })
}

// [POST] /user/register
module.exports.registerPost = async (req, res) => {
    // console.log(req.body);
    const existEmail = await User.findOne({
        email: req.body.email,
        deleted: false
    });

    if (existEmail) {
        req.flash("error", "Email đã tồn tại!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    req.body.password = md5(req.body.password);

    const user = new User(req.body);
    await user.save();

    res.cookie("tokenUser", user.tokenUser);

    res.redirect("/");
}

// [GET] /user/login
module.exports.login = async (req, res) => {
    // console.log(req.body);
    res.render("client/pages/user/login", {
        pageTitle: "Đăng nhập"
    })
}

// [POST] /user/login
module.exports.loginPost = async (req, res) => {
    // console.log(req.body);
    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({
        email: email,
        deleted: false
    });

    if (!user) {
        req.flash("error", "Email không tồn tại!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    if (md5(password) != user.password) {
        req.flash("error", "Sai mật khẩu!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    if (user.status == "inactive") {
        req.flash("error", "Tài khoản đang bị khóa!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    // Luu user_id vao collection carts
    // console.log(user.id);
    // console.log(req.cookies.cartId);
    
    await Cart.updateOne({
        _id: req.cookies.cartId
    }, {
        user_id: user.id
    });

    res.cookie("tokenUser", user.tokenUser);

    res.redirect("/");
}

// [GET] /user/logout
module.exports.logout = async (req, res) => {
    res.clearCookie("tokenUser");
    res.redirect("/");
}

// [GET] /user/password/forgot
module.exports.forgotPassword = async (req, res) => {
    res.render("client/pages/user/forgot-password", {
        pageTitle: "Lấy lại mật khẩu"
    })
}

// [POST] /user/password/forgot
module.exports.forgotPasswordPost = async (req, res) => {
    // console.log(req.body.email);
    const email = req.body.email;

    const user = await User.findOne({
        email: email,
        deleted: false
    });

    if (!user) {
        req.flash("error", "Email không tồn tại!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    // Việc 1: Tạo mã OTP và lưu thông tin yêu cầu vào collection forgot-password
    const otp = generateHelper.generateRandomNumber(8);

    const objectForgotPassword = {
        email: email,
        otp: otp,
        expireAt: new Date(Date.now() + 3 * 60 * 1000)
    }

    const forgotPassword = new ForgotPassword(objectForgotPassword);
    await forgotPassword.save();

    // Việc 2: Gửi mã OTP qua email của user 
    const subject = "Mã OTP xác minh lấy lại mật khẩu";
    const html = `
        Mã OTP xác minh lấy lại mật khẩu là <b>${otp}</b>. Thời hạn sử dụng là 3 phút. Lưu ý không được để lộ mã OTP.
    `
    // console.log("Email người nhận:", email);
    sendMailHelper.sendMail(email, subject, html);

    res.redirect(`/user/password/otp?email=${email}`);
}

// [GET] /user/password/otp
module.exports.otpPassword = async (req, res) => {
    const email = req.query.email;

    // console.log(email);

    res.render("client/pages/user/otp-password", {
        pageTitle: "Nhập mã OTP",
        email: email
    })
}

// [POST] /user/password/otp
module.exports.otpPasswordPost = async (req, res) => {
    const email = req.body.email;
    const otp = req.body.otp;

    // console.log({
    //     email: email,
    //     otp: otp
    // });

    const result = await ForgotPassword.findOne({
        email: email,
        otp: otp
    });

    if (!result) {
        req.flash("error", "OTP không hợp lệ!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    const user = await User.findOne({
        email: email
    });

    // Gui kem cai tokenUser de cac lan truy cap khac se hop le 
    res.cookie("tokenUser", user.tokenUser);

    res.redirect("/user/password/reset");
}

// [GET] /user/info/edit
module.exports.infoEdit = async (req, res) => {
    res.render("client/pages/user/info-edit", {
        pageTitle: "Chỉnh sửa thông tin cá nhân"
    })
}

// [PATCH] /user/info/edit
module.exports.infoEditPatch = async (req, res) => {
    try {
        const updateData = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            address: req.body.address,
        };

        // Middleware uploadCloud đã gán URL ảnh vào req.body.avatar nếu có file mới
        if (req.body.avatar) {
            updateData.avatar = req.body.avatar;
        }

        await User.updateOne({ _id: res.locals.user.id }, updateData);

        req.flash("success", "Cập nhật thông tin thành công!");
        res.redirect("/user/info");
    } catch (error) {
        req.flash("error", "Cập nhật thông tin thất bại!");
        res.redirect(req.get("Referrer") || "/");
    }
};

// [GET] /user/info
module.exports.info = async (req, res) => {
    res.render("client/pages/user/info", {
        pageTitle: "Thông tin cá nhân"
    })
}

// [GET] /user/password/reset 
module.exports.resetPassword = async (req, res) => {
    res.render("client/pages/user/reset-password", {
        pageTitle: "Đổi mật khẩu"
    })
}

// [POST] /user/password/reset 
module.exports.resetPasswordPost = async (req, res) => {
    const password = req.body.password;
    // const confirmPassword = req.body.confirmPassword;
    const tokenUser = req.cookies.tokenUser;

    // console.log(password);
    // console.log(tokenUser);
    await User.updateOne({
        tokenUser: tokenUser
    }, {
        password: md5(password)
    })

    req.flash("success", "Đổi mật khẩu thành công!");
    
    res.redirect("/");
}

// [GET] /user/orders
module.exports.orders = async (req, res) => {
    const orders = await Order.find({
        user_id: res.locals.user.id,
        deleted: false
    }).sort({ createdAt: "desc" }).lean();

    for (const order of orders) {
        order.status = order.status || "pending";
        order.statusMeta = getOrderStatus(order.status);
        order.totalPrice = order.products.reduce((sum, item) => {
            return sum + productsHelper.priceNewProduct(item) * item.quantity;
        }, 0);

        const productIds = order.products.map(item => item.product_id);
        const productRecords = await Product.find({
            _id: { $in: productIds }
        }).select("title thumbnail slug").lean();

        order.productPreviews = order.products.slice(0, 4).map(item => ({
            quantity: item.quantity,
            productInfo: productRecords.find(product => product._id.toString() === item.product_id.toString())
        }));
    }

    res.render("client/pages/user/orders", {
        pageTitle: "Đơn hàng của tôi",
        orders
    });
}

// [PATCH] /user/orders/:orderId/cancel
module.exports.cancelOrder = async (req, res) => {
    const orderId = req.params.orderId;
    const redirectPath = mongoose.isValidObjectId(orderId)
        ? `/user/orders/${orderId}`
        : "/user/orders";

    if (!mongoose.isValidObjectId(orderId)) {
        req.flash("error", "Đơn hàng không hợp lệ.");
        return res.redirect(redirectPath);
    }

    const predefinedReasons = [
        "Tôi muốn thay đổi sản phẩm trong đơn",
        "Tôi muốn thay đổi địa chỉ hoặc thông tin nhận hàng",
        "Tôi tìm được mức giá tốt hơn",
        "Thời gian giao hàng không còn phù hợp"
    ];
    const selectedReason = String(req.body.cancelReason || "").trim();
    const otherReason = String(req.body.otherReason || "").trim();
    const reason = selectedReason === "other" ? otherReason : selectedReason;

    if (!reason || (selectedReason !== "other" && !predefinedReasons.includes(reason))) {
        req.flash("error", "Vui lòng chọn hoặc nhập lý do hủy đơn hàng.");
        return res.redirect(redirectPath);
    }

    if (reason.length > 500) {
        req.flash("error", "Lý do hủy không được vượt quá 500 ký tự.");
        return res.redirect(redirectPath);
    }

    const order = await Order.findOneAndUpdate({
        _id: orderId,
        user_id: res.locals.user.id,
        deleted: { $ne: true },
        $or: [
            { status: "pending" },
            { status: null },
            { status: { $exists: false } }
        ]
    }, {
        $set: {
            status: "cancelled",
            cancellation: {
                reason,
                source: "client",
                cancelledAt: new Date()
            }
        }
    });

    if (!order) {
        req.flash("error", "Chỉ có thể hủy đơn hàng đang chờ xác nhận.");
        return res.redirect(redirectPath);
    }

    if (order.inventoryReserved && !order.inventoryRestored) {
        await inventoryHelper.restoreProducts(order.products);
        await Order.updateOne({ _id: order._id }, { $set: { inventoryRestored: true } });
    }

    req.flash("success", "Đơn hàng đã được hủy thành công.");
    return res.redirect(redirectPath);
}

// [GET] /user/orders/:orderId
module.exports.orderDetail = async (req, res) => {
    const order = await Order.findOne({
        _id: req.params.orderId,
        user_id: res.locals.user.id
    }).lean();

    if (!order) {
        req.flash("error", "Không tìm thấy đơn hàng của bạn.");
        return res.redirect("/user/orders");
    }

    for (const item of order.products) {
        item.productInfo = await Product.findOne({ _id: item.product_id })
            .select("title thumbnail slug")
            .lean();
        item.priceNew = productsHelper.priceNewProduct(item);
        item.totalPrice = item.priceNew * item.quantity;
    }

    order.totalPrice = order.products.reduce((sum, item) => sum + item.totalPrice, 0);
    order.status = order.status || "pending";
    order.statusMeta = getOrderStatus(order.status);

    res.render("client/pages/user/order-detail", {
        pageTitle: "Chi tiết đơn hàng",
        order,
        orderProgress: ORDER_STATUSES.filter(item => item.step > 0)
    });
}
