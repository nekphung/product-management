const Cart = require("../../models/cart.model");

module.exports.cartId = async (req, res, next) => {
    // console.log("Luon chay vao day");
    // console.log(req.cookies.cartId);
    if (!req.cookies.cartId) {
        const cart = new Cart();
        await cart.save();

        const expiresTime = 1000*60*60*24*365;

        // console.log(cart);
        // Mac dinh luu theo phien, tat trinh duyet thi no se bi mat
        res.cookie("cartId", cart.id, {
            expires: new Date(Date.now() + expiresTime)
        });
    } else {
        // Khi da co gio hang 
        
    }

    next();
}