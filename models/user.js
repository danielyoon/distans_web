const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//TODO: I don't know if I want to keep both history AND notifications?
const schema = new Schema(
  {
    role: { type: String, enum: ["User", "Premium", "Admin"], default: "User" },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    photo: String,
    countryCode: { type: String, required: true },
    phoneNumber: { type: Number, required: true },
    birthday: { type: String, required: true },
    isLocationAlwaysOn: { type: Boolean, default: false },
    currentLocation: String,
    time: { type: Date, default: () => new Date(0) },
    email: String,
    passwordHash: String,
    history: { type: Array, default: [] },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    privatePlaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    eta: { type: Array, default: [] },
    schemaVersion: { type: Number, default: 1 },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
  },
  {
    timestamps: true,
    collection: "users",
  }
);

module.exports = mongoose.model("User", schema);
