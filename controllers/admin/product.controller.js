const Product = require("../../models/product.model");
const ProductCategory = require("../../models/products-category.model");
const Account = require("../../models/account.model");
const StockWaitlist = require("../../models/stock-waitlist.model");

const filterStatusHelper = require("../../helpers/filterStatus");
const searchHelper = require("../../helpers/search")
const paginationHelper = require("../../helpers/pagination")
const createTreeHelper = require("../../helpers/createTree")

const systemConfig = require("../../config/system");

// [GET] /admin/products
module.exports.index = async (req, res) => {
    // console.log(req.query.status);

    const filterStatus = filterStatusHelper(req.query);

    // console.log(filterStatus);

    let find = {
        deleted: false
    };

    // Lấy ra từ request 
    if (req.query.status) {
        find.status = req.query.status;
    }

    const objectSearch = searchHelper(req.query);

    // console.log(objectSearch);

    if (objectSearch.regex) {
        find.title = objectSearch.regex;
    }

    const countProducts = await Product.countDocuments(find);
    
    // Pagination
    let objectPagination = paginationHelper(
        {
            currentPage: 1,
            limitItem: 4
        }, 
        req.query, 
        countProducts
    );

    // End Pagination 

    // Sort 
    let sort = {};

    if (req.query.sortKey && req.query.sortValue) {
        sort[req.query.sortKey] = req.query.sortValue;
    } else {
        sort.position = "desc";
    }
    // End Sort 

    // if (req.query.page) {
    //     objectPagination.currentPage = parseInt(req.query.page);
    // }

    // objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItem;
    // // console.log(objectPagination.currentPage);

    // const countProducts = await Product.countDocuments(find);
    // const totalPage = Math.ceil(countProducts/objectPagination.limitItem);
    // objectPagination.totalPage = totalPage;
    // console.log(totalPage);
    // End Pagination

    const products = await Product.find(find)
        .sort(sort)
        .limit(objectPagination.limitItem)
        .skip(objectPagination.skip);

    for (const product of products) {
        // Lấy ra thông tin người tạo 
        const user = await Account.findOne({
            _id: product.createdBy.account_id
        })
        if (user) {
            product.accountFullName = user.fullName;
        }
        
        // Lấy ra thông tin cập nhật gần nhất 
        // console.log(product.updatedBy[product.updatedBy.length - 1]);
        // const updatedBy = product.updatedBy[product.updatedBy.length - 1];
        const updatedBy = product.updatedBy.slice(-1)[0];
        
        // Phai co update thi moi thuc hien truy vet nguoi sua 
        if (updatedBy) {
            const userUpdated = await Account.findOne({
                _id: updatedBy.account_id
            });

            updatedBy.accountFullName = userUpdated.fullName;
        }
        // console.log(product);
    }

    // console.log(products);

    res.render("admin/pages/products/index", {
        pageTitle: "Danh sách sản phẩm",
        products: products,
        filterStatus: filterStatus,
        keyword: objectSearch.keyword,
        pagination: objectPagination
    });
}

// [PATCH] /admin/products/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    // console.log(req.params);
    const status = req.params.status;
    const id = req.params.id;

    const updatedBy = {
        account_id: res.locals.user.id,
        updatedAt: new Date()
    }

    await Product.updateOne({_id: id}, {
        status: status,
        $push: { updatedBy: updatedBy}
    });

    req.flash("success", "Cập nhật trạng thái thành công!");

    res.redirect(req.get("Referrer") || "/");
}

// [PATCH] /admin/products/change-multi
module.exports.changeMulti = async (req, res) => {
    // console.log(req.body);
    // res.send("Oke");
    const type = req.body.type;
    const ids = req.body.ids.split(", "); // Vì form không gửi được mảng nên phải dùng join

    const updatedBy = {
        account_id: res.locals.user.id,
        updatedAt: new Date()
    }

    switch (type) {
        case "active":
            await Product.updateMany(
                {_id: {$in: ids}}, 
                { 
                    status: "active",
                    $push: { updatedBy: updatedBy} 
                }
            )
            req.flash("success", `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break;
        case "inactive":
            await Product.updateMany(
                {_id: {$in: ids}}, 
                { 
                    status: "inactive",
                    $push: { updatedBy: updatedBy}
                }
            )
            req.flash("success", `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break;
        case "delete-all":
            await Product.updateMany(
                {_id: {$in: ids}},
                { 
                    deleted: true,
                    deletedBy: {
                        account_id: res.locals.user.id,
                        deletedAt: new Date() // cái này lấy thời gian thực
                    }
                }
            )
            req.flash("success", `Đã xóa thành công ${ids.length} sản phẩm!`);
            break;
        case "change-position":
            // console.log(ids);
            for (const item of ids) {
                let [id, position] = item.split("-");
                position = parseInt(position);
                // console.log(id);
                // console.log(position);
                await Product.updateOne({_id: id}, {
                    position: position,
                    $push: { updatedBy: updatedBy}                
                })
            }
            req.flash("success", `Đã đổi vị trí thành công ${ids.length} sản phẩm!`);
            break;
        default:
            break;
    }
    // console.log(type);
    // console.log(ids);
    res.redirect(req.get("Referrer") || "/");
}

// [DELETE] /admin/products/delete/:id
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;

    // await Product.deleteOne( { _id: id });
    await Product.updateOne({_id: id}, {
        deleted: true,
        deletedBy: {
            account_id: res.locals.user.id,
            deletedAt: new Date() // cái này lấy thời gian thực
        }
    });

    req.flash("success", `Đã xóa thành công sản phẩm!`);

    res.redirect(req.get("Referrer") || "/");
}

// [GET] /admin/products/create
module.exports.create = async (req, res) => {
    // console.log(res.locals.user);
    const find = {
        deleted: false,
    }

    const category = await ProductCategory.find(find);

    const newCategory = createTreeHelper.tree(category);

    res.render("admin/pages/products/create", {
        pageTitle: "Thêm mới sản phẩm",
        category: newCategory
    });
}

// [POST] /admin/products/create
module.exports.createPost = async (req, res) => {

    // if (req.body.title.length < 8) {
    //     req.flash("error", "Vui lòng nhập tiêu đề ít nhất 8 ký tự!");
    //     res.redirect(req.get("Referrer") || "/");
    //     return;
    // }

    // console.log(req.file);
    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);

    if (req.body.position == "") {
        const countProducts = await Product.countDocuments();
        req.body.position = countProducts + 1;
        // console.log(countProducts);
    } else {
        req.body.position = parseInt(req.body.position);
    }

    req.body.createdBy = {
        account_id: res.locals.user.id
    }

    // if (req.file) {
    //     req.body.thumbnail = `/uploads/${req.file.filename}`;
    // }
    // req.body.thumbnail = `/uploads/${req.file.filename}`;

    const product = new Product(req.body);
    await product.save(); 

    res.redirect(`${systemConfig.prefixAdmin}/products`);
}

// [GET] /admin/products/edit/:id
module.exports.edit = async (req, res) => {
    // console.log(req.params.id);
    try {
        const find = {
            deleted: false,
            _id: req.params.id
        };

        const product = await Product.findOne(find);
        // console.log(product);

        const category = await ProductCategory.find({
            deleted: false
        });

        const newCategory = createTreeHelper.tree(category);

        res.render("admin/pages/products/edit", {
            pageTitle: "Chỉnh sửa sản phẩm",
            product: product,
            category: newCategory
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products`);
    }
}

// [PATCH] /admin/products/edit/:id
module.exports.editPatch = async (req, res) => {
    const id = req.params.id;
    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);
    req.body.position = parseInt(req.body.position);

    try {
        const updatedBy = {
            account_id: res.locals.user.id,
            updatedAt: new Date()
        }

        // Nếu như vầy thì bị ghi đè 
        // req.body.updatedBy = updatedBy;

        await Product.updateOne({ _id: id }, {
            ...req.body,
            $push: { updatedBy: updatedBy }
        });

        req.flash("success", `Cập nhật thành công!`);
    } catch (error) {
        req.flash("error", `Cập nhật thất bại!`);
    }

    res.redirect(req.get("Referrer") || "/");
}

// [GET] /admin/products/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const find = {
            deleted: false,
            _id: req.params.id
        };

        const product = await Product.findOne(find);

        const permissions = res.locals.role?.permissions || [];
        const canViewWaitlist = permissions.includes("roles_permissions")
            || permissions.includes("stock-waitlist_view");
        const waitlist = canViewWaitlist
            ? await StockWaitlist.find({
                product_id: product.id,
                status: "waiting"
            }).sort({ createdAt: -1 }).lean()
            : [];

        // console.log(product);
        res.render("admin/pages/products/detail", {
            pageTitle: product.title,
            product: product,
            waitlist,
            canViewWaitlist
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products`);
    }
}

