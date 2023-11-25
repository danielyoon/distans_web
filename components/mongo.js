const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI);
mongoose.set("strictQuery", true);

module.exports = {
  User: require("../models/user"),
  Place: require("../models/place"),
  RefreshToken: require("../models/refresh_token"),
};
