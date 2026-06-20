const express = require("express");
require("dotenv").config();

const database = require("./config/database");

const systemConfig = require("./config/system");

// Route của admin và của client 
const routeAdmin = require("./routes/admin/index.route");
const route = require("./routes/client/index.route");

database.connect();

const app = express();
const port = process.env.PORT;

app.set("views", "./views");
app.set("view engine", "pug");

app.use(express.static('public'));

// App Locals Variable, do không include vào trong file .pug được nên phải dùng cái này.
// Và nó đã trở thành biến toàn cục.
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// Routes
routeAdmin(app); 
route(app); 

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});