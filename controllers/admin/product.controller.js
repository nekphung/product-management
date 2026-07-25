const Product = require("../../models/product.model");

const filterStatusHelper = require("../../helpers/filterStatus");
const searchHelper = require("../../helpers/search")
const paginationHelper = require("../../helpers/pagination")

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

    const products = await Product.find(find).limit(objectPagination.limitItem).
    skip(objectPagination.skip);

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
            break;
        case "inactive":
            await Product.updateMany(
                {_id: {$in: ids}}, 
                { status: "inactive" }
            )
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

    res.redirect(req.get("Referrer") || "/");
}
