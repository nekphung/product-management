const Account = require("../../models/account.model");
const md5 = require('md5');
const Role = require("../../models/role.model");
const mongoose = require("mongoose");

const systemConfig = require("../../config/system");

// [GET] /admin/accounts
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    // const records = await Account.find(find).select("fullName email");
    const records = await Account.find(find).select("-password -token");

    for (const record of records) {
        const role = await Role.findOne({
            _id: record.role_id,
            deleted: false
        });
        record.role = role;
    }

    res.render("admin/pages/accounts/index", {
        pageTitle: "Danh sách tài khoản",
        records: records
    });
}

// [GET] /admin/accounts/create
module.exports.create = async (req, res) => {
    const roles = await Role.find({
        deleted: false
    });

    res.render("admin/pages/accounts/create", {
        pageTitle: "Tạo mới tài khoản",
        roles: roles
    });
}

// [POST] /admin/accounts/create
module.exports.createPost = async (req, res) => {
    const emailExist = await Account.findOne({
        email: req.body.email,
        deleted: false
    });

    // console.log(emailExist);
    if (emailExist) {
        req.flash("error", `Email ${req.body.email} đã tồn tại`);
        res.redirect(req.get("Referrer") || "/");
    } else {
        req.body.password = md5(req.body.password);

        const record = new Account(req.body);
        await record.save();

        res.redirect(`${systemConfig.prefixAdmin}/accounts`);
    }
}

// [GET] /admin/accounts/edit/:id
module.exports.edit = async (req, res) => {
    const id = req.params.id;

    let find = {
        _id: id,
        deleted: false
    };

    try {
        const data = await Account.findOne(find);
        const roles = await Role.find({
            deleted: false
        })

        // console.log(data);
        res.render("admin/pages/accounts/edit", {
            pageTitle: "Chỉnh sửa tài khoản",
            data: data,
            roles: roles,
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/accounts`)
    }
}

// [PATCH] /admin/accounts/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const id = req.params.id;
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

// [DELETE] /admin/accounts/delete/:id
module.exports.deleteItem = async (req, res) => {
    const redirectPath = `${systemConfig.prefixAdmin}/accounts`;
    if (!res.locals.role.permissions.includes("accounts_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa tài khoản admin.");
        return res.redirect(req.get("Referrer") || redirectPath);
    }
    if (req.params.id === res.locals.user.id.toString()) {
        req.flash("error", "Bạn không thể xóa tài khoản đang đăng nhập.");
        return res.redirect(req.get("Referrer") || redirectPath);
    }

    await Account.updateOne(
        { _id: req.params.id, deleted: false },
        { deleted: true, deletedAt: new Date() }
    );
    req.flash("success", "Đã xóa tài khoản admin.");
    res.redirect(redirectPath);
};

// [GET] /admin/accounts/detail/:id
module.exports.detail = async (req, res) => {
    if (!res.locals.role.permissions.includes("accounts_view") || !mongoose.isValidObjectId(req.params.id)) {
        return res.redirect(`${systemConfig.prefixAdmin}/accounts`);
    }

    const account = await Account.findOne({ _id: req.params.id, deleted: false })
        .select("-password -token")
        .lean();
    if (!account) return res.redirect(`${systemConfig.prefixAdmin}/accounts`);

    const accountRole = account.role_id && mongoose.isValidObjectId(account.role_id)
        ? await Role.findOne({ _id: account.role_id, deleted: false }).lean()
        : null;

    res.render("admin/pages/accounts/detail", {
        pageTitle: account.fullName || "Chi tiết tài khoản admin",
        account,
        accountRole
    });
};
