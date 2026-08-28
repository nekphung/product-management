const User = require("../../models/user.model");

module.exports.requireAuth = async (req, res, next) => {
    if (!req.cookies.tokenUser) {
        res.redirect(`/user/login`);
        return; 
    }
    // console.log(req.cookies.tokenUser);
    const user = await User.findOne({
        tokenUser: req.cookies.tokenUser,
        deleted: false
    }).select("-password");
    
    if (!user) {
        res.redirect(`/user/login`);
        return;
    }

    // Giữ thông tin người dùng cho trang tài khoản và các middleware sau.
    res.locals.user = user;
    next();
}
