const Role = require("../../models/role.model");
const Account = require("../../models/account.model");
const mongoose = require("mongoose");

const systemConfig = require("../../config/system");

// [GET] /admin/roles 
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    const records = await Role.find(find);

    res.render("admin/pages/roles/index", {
        pageTitle: "Nhóm quyền",
        records: records
    });
}

// [GET] /admin/roles/create
module.exports.create = async (req, res) => {
    res.render("admin/pages/roles/create", {
        pageTitle: "Tạo nhóm quyền",
    });
}

// [POST] /admin/roles/create
module.exports.createPost = async (req, res) => {
    // console.log(req.body);
    const record = new Role(req.body);

    await record.save();

    res.redirect(`${systemConfig.prefixAdmin}/roles`);
}

// [GET] /admin/roles/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;

        let find = {
            _id: id,
            deleted: false
        };

        const data = await Role.findOne(find);

        // console.log(data);
        res.render("admin/pages/roles/edit", {
            pageTitle: "Chỉnh sửa nhóm quyền",
            data: data
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/roles`)
    }
}

// [PATCH] /admin/roles/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const id = req.params.id;

        await Role.updateOne({_id: id}, req.body);

        req.flash("success", "Cập nhật nhóm quyền thành công!");

        res.redirect(req.get("Referrer") || "/");
    } catch (error) {
        req.flash("error", "Cập nhật nhóm quyền thất bại!");
    }
}

// [GET] /admin/roles/permissions
module.exports.permissions = async (req, res) => {
    let find = {
        deleted: false
    }

    const records = await Role.find(find);

    res.render("admin/pages/roles/permissions", {
        pageTitle: "Phân quyền",
        records: records
    })
}

// [PATCH] /admin/roles/permissions
module.exports.permissionsPatch = async (req, res) => {
    try {
        const permissions = JSON.parse(req.body.permissions);
        // console.log(req.body);

        // console.log(permissions);

        for (const item of permissions) {
            const id = item.id;
            const permissions = item.permissions;
            
            await Role.updateOne(
                { _id: id },
                { permissions: permissions } // Chỉ cập nhật đúng mảng permissions
            );
        }

        req.flash("success", "Cập nhật phân quyền thành công!");

        res.redirect(req.get("Referrer") || "/");
    } catch (error) {
        req.flash("error", "Cập nhật phân quyền thất bại!");
    }
}

// [DELETE] /admin/roles/delete/:id
module.exports.deleteItem = async (req, res) => {
    const redirectPath = `${systemConfig.prefixAdmin}/roles`;
    if (!res.locals.role.permissions.includes("roles_delete") || !mongoose.isValidObjectId(req.params.id)) {
        req.flash("error", "Bạn không có quyền xóa nhóm quyền.");
        return res.redirect(req.get("Referrer") || redirectPath);
    }

    const accountUsingRole = await Account.exists({ role_id: req.params.id, deleted: false });
    if (accountUsingRole) {
        req.flash("error", "Không thể xóa nhóm quyền đang được tài khoản admin sử dụng.");
        return res.redirect(req.get("Referrer") || redirectPath);
    }

    await Role.updateOne(
        { _id: req.params.id, deleted: false },
        { deleted: true, deletedAt: new Date() }
    );
    req.flash("success", "Đã xóa nhóm quyền.");
    res.redirect(redirectPath);
};
