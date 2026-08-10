const ProductCategory = require("../models/products-category.model");

module.exports.getSubCategory = async (parentId) => {
    const getCategory = async (parentId) => {
        let allSub = [];

        const childCategories = await ProductCategory.find({
            parent_id: parentId,
            deleted: false,
            status: "active"
        });

        for (const child of childCategories) {
            allSub.push(child);

            // Sửa dòng này: gọi getCategory thay vì getSubCategory
            const subChildren = await getCategory(child.id); 
            
            allSub = allSub.concat(subChildren);
        }

        return allSub;
    }

    const result = await getCategory(parentId);
    return result;
};