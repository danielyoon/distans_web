const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  id: String,
  expires: Date,
});

schema.virtual("isExpired").get(function () {
  return Date.now() >= this.expires;
});

module.exports = mongoose.model("QrCode", schema);
