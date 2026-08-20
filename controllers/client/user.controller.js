const md5 = require("md5");
const User = require("../../models/user.model");
const ForgotPassword = require("../../models/forgot-password.model");

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
    console.log("Email người nhận:", email);
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