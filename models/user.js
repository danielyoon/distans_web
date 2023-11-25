const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    role: { type: String, enum: ["User", "Admin"], default: "User" },
    firstName: { type: String, require: true },
    lastName: { type: String, require: true },
    photo: String,
    countryCode: { type: String, require: true },
    phoneNumber: { type: Number, require: true },
    birthday: { type: String, require: true },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

module.exports = mongoose.model("User", schema);
