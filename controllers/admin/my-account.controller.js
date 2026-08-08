const Account = require("../../models/account.model");
const md5 = require('md5');

// [GET] /admin/my-account 
module.exports.index = (req, res) => {
    res.render("admin/pages/my-account/index", {
        pageTitle: "Thông tin cá nhân"
    });
}

// [GET] /admin/my-account/edit
module.exports.edit = (req, res) => {
    res.render("admin/pages/my-account/edit", {
        pageTitle: "Chỉnh sửa thông tin cá nhân"
    });
}

// [PATCH] /admin/my-account/edit
module.exports.editPatch = async (req, res) => {
    try {
        const id = res.locals.user.id;
        const emailExist = await Account.findOne({
            _id: { $ne: id },
            email: req.body.email,
            deleted: false
        });

        // console.log(emailExist);
        if (emailExist) {
            req.flash("error", `Email ${req.body.email} đã tồn tại`);
        } else {
            // Neu nguoi dung khong muon cap nhat mat khau thi khong nhap vao password
            if (req.body.password) {
                req.body.password = md5(req.body.password);
            } else {
                delete req.body.password;
            }

            await Account.updateOne({_id: id}, req.body);

            req.flash("success", "Cập nhật tài khoản thành công!");
        }

        res.redirect(req.get("Referrer") || "/");
        
    } catch (error) {
        req.flash("error", "Cập nhật tài khoản thất bại!");
    }
}
