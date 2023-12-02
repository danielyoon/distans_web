const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    role: { type: String, enum: ["User", "Admin"], default: "User" },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    photo: String,
    countryCode: { type: String, required: true },
    phoneNumber: { type: Number, required: true },
    birthday: { type: String, required: true },
    isLocationAlwaysOn: { type: Boolean, default: false },
    currentLocation: String,
    time: { type: Date, default: () => new Date(0) },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

module.exports = mongoose.model("User", schema);
