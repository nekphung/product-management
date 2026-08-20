const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("express-flash");
const moment = require("moment");

require("dotenv").config();

const database = require("./config/database");

const systemConfig = require("./config/system");

// Route của admin và của client 
const routeAdmin = require("./routes/admin/index.route");
const route = require("./routes/client/index.route");

database.connect();

const app = express();
const port = process.env.PORT;

app.use(methodOverride("_method"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

app.set("views", `${__dirname}/views`);
app.set("view engine", "pug");

// flash
app.use(cookieParser('nekphung7122006'));
app.use(session({
    secret: 'nekphung7122006',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 }
}));
app.use(flash());
// End flash

// TinyMCE
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));

// console.log(__dirname);
app.use(express.static(`${__dirname}/public`));

// App Locals Variable, do không include vào trong file .pug được nên phải dùng cái này.
// Và nó đã trở thành biến toàn cục.
app.locals.prefixAdmin = systemConfig.prefixAdmin;
app.locals.moment = moment;

// Routes
routeAdmin(app); 
route(app); 

app.get("{*path}", (req, res) => {
  res.render("client/pages/errors/404", {
    pageTitle: "404 Not Found"
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});