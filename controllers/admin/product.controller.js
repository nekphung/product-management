const Product = require("../../models/product.model");

const filterStatusHelper = require("../../helpers/filterStatus");
const searchHelper = require("../../helpers/search")
const paginationHelper = require("../../helpers/pagination")

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

    await Product.updateOne({_id: id}, {status: status});

    req.flash("success", "Cập nhật trạng thái thành công!");

    res.redirect(req.get("Referrer") || "/");
}

// [PATCH] /admin/products/change-multi
module.exports.changeMulti = async (req, res) => {
    // console.log(req.body);
    // res.send("Oke");
    const type = req.body.type;
    const ids = req.body.ids.split(", "); // Vì form không gửi được mảng nên phải dùng join

    switch (type) {
        case "active":
            await Product.updateMany(
                {_id: {$in: ids}}, 
                { status: "active" }
            )
            req.flash("success", `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break;
        case "inactive":
            await Product.updateMany(
                {_id: {$in: ids}}, 
                { status: "inactive" }
            )
            req.flash("success", `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break;
        case "delete-all":
            await Product.updateMany(
                {_id: {$in: ids}},
                { 
                    deleted: true,
                    deletedAt: new Date()
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
                    position: position                
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
        deletedAt: new Date() // cái này lấy thời gian thực
    });

    req.flash("success", `Đã xóa thành công sản phẩm!`);

    res.redirect(req.get("Referrer") || "/");
}

// [GET] /admin/products/create
module.exports.create = async (req, res) => {
    res.render("admin/pages/products/create", {
        pageTitle: "Thêm mới sản phẩm",
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

        res.render("admin/pages/products/edit", {
            pageTitle: "Chỉnh sửa sản phẩm",
            product: product 
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

    if (req.file) {
        req.body.thumbnail = `/uploads/${req.file.filename}`;
    }

    try {
        await Product.updateOne({ _id: id }, req.body);
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

        // console.log(product);
        res.render("admin/pages/products/detail", {
            pageTitle: product.title,
            product: product
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products`);
    }
}