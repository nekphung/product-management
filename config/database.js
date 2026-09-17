const dns = require("node:dns");
const mongoose = require("mongoose");

module.exports.connect = async () => {
    try {
        if (process.env.MONGO_DNS_SERVERS) {
            dns.setServers(process.env.MONGO_DNS_SERVERS.split(",").map(server => server.trim()).filter(Boolean));
        }
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connect Success!");
    } catch (error) {
        console.log("Connect Error!");
        throw error;
    }
}
