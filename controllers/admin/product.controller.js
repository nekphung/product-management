const Product = require("../../models/product.model");

// [GET] admin/products
module.exports.index = async (req, res) => {
    // console.log(req.query.status);

    // Cái này sẽ được load lại sau mỗi request 
    let filterStatus = [
        {
            name: "Tất cả",
            status: "",
            class: ""
        },
        {
            name: "Hoạt động",
            status: "active",
            class: ""
        },
        {
            name: "Dừng hoạt động",
            status: "inactive",
            class: ""
        }
    ];

    if (req.query.status) {
        const index = filterStatus.findIndex(item => {
            return item.status == req.query.status;   
        });
        filterStatus[index].class="active";
        // console.log(index);
    } else {
        const index = filterStatus.findIndex(item => {
            return item.status == "";   
        });
        filterStatus[index].class="active";
    }

    let find = {
        deleted: false
    }

    // Lấy ra từ request 
    if (req.query.status) {
        find.status = req.query.status;
    }

    const products = await Product.find(find);

    // console.log(products);

    res.render("admin/pages/products/index", {
        pageTitle: "Danh sách sản phẩm",
        products: products,
        filterStatus: filterStatus
    })
}