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

    if (!email || !password) {
        req.flash("error", "Vui lòng nhập email và mật khẩu.");
        return res.redirect(`${systemConfig.prefixAdmin}/auth/login`);
    }

    const account = await Account.findOne({ email: email, deleted: false });

    if (!account || account.password !== md5(password)) {
        req.flash("error", "Email hoặc mật khẩu không đúng.");
        return res.redirect(`${systemConfig.prefixAdmin}/auth/login`);
    }

    req.session.user = {
        id: account._id,
        email: account.email,
        fullName: account.fullName,
        role_id: account.role_id
    };

    res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
}
