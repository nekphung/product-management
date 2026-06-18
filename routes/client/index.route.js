const productRouter = require("./product.route");
const homeRouter = require("./home.route");

module.exports = (app) => {
    app.use("/", homeRouter);
    // app.get("/", (req, res) => {
    //     res.render("client/pages/home/index");
    // });

    app.use("/products", productRouter); 
    // app.get("/products", (req, res) => {
    //     res.render("client/pages/products/index");
    // });
}

