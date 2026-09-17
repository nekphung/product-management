const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const Category = require("../models/products-category.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const controller = require("../controllers/admin/products-category.controller");
const id = "0123456789abcdef01234567";
const response = (...permissions) => ({
    locals: { role: { permissions } },
    sendStatus(code) { this.code = code; },
    redirect(url) { this.url = url; },
    render(view, data) { this.view = view; this.data = data; }
});
afterEach(() => mock.restoreAll());

test("database connection errors reach the startup error handler", async () => {
    const error = new Error("Connection unavailable");
    mock.method(require("mongoose"), "connect", async () => { throw error; });
    mock.method(console, "log", () => {});
    await assert.rejects(require("../config/database").connect(), error);
});

test("database connection supports explicitly configured DNS servers", async () => {
    const previous = process.env.MONGO_DNS_SERVERS;
    process.env.MONGO_DNS_SERVERS = "1.1.1.1, 8.8.8.8";
    try {
        const setServers = mock.method(require("node:dns"), "setServers", () => {});
        mock.method(require("mongoose"), "connect", async () => {});
        mock.method(console, "log", () => {});
        await require("../config/database").connect();
        assert.deepEqual(setServers.mock.calls[0].arguments, [["1.1.1.1", "8.8.8.8"]]);
    } finally {
        if (previous === undefined) delete process.env.MONGO_DNS_SERVERS;
        else process.env.MONGO_DNS_SERVERS = previous;
    }
});

test("all admin and client routes register without startup errors", () => {
    const app = require("express")();
    require("../routes/admin/index.route")(app);
    require("../routes/client/index.route")(app);
});

test("category detail supplies the data expected by its template", async () => {
    const category = { _id: id, title: "Example", parent_id: "" };
    mock.method(Category, "findOne", async () => category);
    mock.method(Category, "find", () => ({ sort: async () => [] }));
    mock.method(Product, "find", filter => {
        assert.equal(filter.product_category_id, id);
        return { sort: () => ({ limit: async () => [] }) };
    });
    mock.method(Product, "countDocuments", async () => 0);
    const res = response("products-category_view");
    await controller.detail({ params: { id } }, res);
    assert.equal(res.view, "admin/pages/products-category/detail");
    assert.deepEqual(res.data, { pageTitle: "Example", category, parent: null, children: [], products: [], productCount: 0 });
});

test("missing category detail returns 404", async () => {
    mock.method(Category, "findOne", async () => null);
    const res = response("products-category_view");
    await controller.detail({ params: { id } }, res);
    assert.equal(res.code, 404);
});

test("bulk status changes target only selected undeleted categories", async () => {
    const update = mock.method(Category, "updateMany", async () => ({}));
    const res = response("products-category_edit");
    await controller.changeMulti({ body: { type: "inactive", ids: id }, flash() {} }, res);
    assert.deepEqual(update.mock.calls[0].arguments, [
        { _id: { $in: [id] }, deleted: false }, { $set: { status: "inactive" } }
    ]);
    assert.equal(res.url, "/admin/products-category");
});

test("bulk position updates validate all entries before writing", async () => {
    const update = mock.method(Category, "updateOne", async () => ({}));
    const res = response("products-category_edit");
    await controller.changeMulti({ body: { type: "change-position", ids: `${id}-2, ${id}-bad` } }, res);
    assert.equal(res.code, 400);
    assert.equal(update.mock.callCount(), 0);
    await controller.changeMulti({ body: { type: "change-position", ids: `${id}-2` }, flash() {} }, res);
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: id, deleted: false }, { $set: { position: 2 } }]);
});

test("deletion enforces permission and soft deletes the category", async () => {
    const update = mock.method(Category, "updateOne", async () => ({ matchedCount: 1 }));
    const denied = response("products-category_edit");
    await controller.deleteItem({ params: { id } }, denied);
    assert.equal(denied.code, 403);
    assert.equal(update.mock.callCount(), 0);
    const res = response("products-category_delete");
    await controller.deleteItem({ params: { id }, flash() {} }, res);
    const [filter, change] = update.mock.calls[0].arguments;
    assert.deepEqual(filter, { _id: id, deleted: false });
    assert.equal(change.$set.deleted, true);
    assert.ok(change.$set.deletedAt instanceof Date);
});

test("bulk deletion requires delete permission", async () => {
    const update = mock.method(Category, "updateMany", async () => ({}));
    const res = response("products-category_edit");
    await controller.changeMulti({ body: { type: "delete-all", ids: id } }, res);
    assert.equal(res.code, 403);
    assert.equal(update.mock.callCount(), 0);
});

test("editing a missing customer redirects instead of throwing ReferenceError", async () => {
    mock.method(User, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
    const res = response("customers_edit");
    await require("../controllers/admin/customer.controller").edit({ params: { id } }, res);
    assert.equal(res.url, "/admin/customers");
});
