const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  token: String,
  created: { type: Date, default: Date.now },
  createdByIp: String,
  expires: Date,
});

schema.virtual("isExpired").get(function () {
  return Date.now() >= this.expires;
});

module.exports = mongoose.model("RefreshToken", schema);
