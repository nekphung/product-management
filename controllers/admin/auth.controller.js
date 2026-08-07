const Account = require("../../models/account.model");
const md5 = require("md5");
const systemConfig = require("../../config/system");

// [GET] /admin/auth/login
module.exports.login = (req, res) => {
    res.render("admin/pages/auth/login", {
        pageTitle: "Trang đăng nhập"
    });
}

// [POST] /admin/auth/login
module.exports.loginPost = async (req, res) => {
    const { email, password } = req.body;

    const account = await Account.findOne({ email: email, deleted: false });

    if (!account) {
        req.flash("error", "Email không tồn tại!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    if (md5(password) != account.password) {
        req.flash("error", "Sai mật khẩu!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    if (account.status == "inactive") {
        req.flash("error", "Tài khoản đã bị khóa!");
        res.redirect(req.get("Referrer") || "/");
        return;
    }

    res.cookie("token", account.token);
    // req.session.user = {
    //     id: account._id,
    //     email: account.email,
    //     fullName: account.fullName,
    //     role_id: account.role_id
    // };

    res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
}

// [GET] /admin/auth/logout
module.exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect(`${systemConfig.prefixAdmin}/auth/login`);
}