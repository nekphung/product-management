const ProductCategory = require("../../models/products-category.model");
const createTreeHelper = require("../../helpers/createTree")

module.exports.category = async (req, res, next) => {
    const find = {
        deleted: false,
    }

    const productsCategory = await ProductCategory.find(find);

    const newProductsCategory = createTreeHelper.tree(productsCategory);

    // console.log(newProductsCategory);
    res.locals.layoutProductsCategory = newProductsCategory;
    
    next();
}