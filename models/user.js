const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
    currentLocation: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    time: { type: Date, default: null },
    email: String,
    passwordHash: String,
    history: [
      {
        place: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
        time: Date,
        visitCount: Number,
      },
    ],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    privatePlaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    eta: { type: Array, default: [] },
    schemaVersion: { type: Number, default: 1 },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
    logs: { type: Array, default: [] },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

module.exports = mongoose.model("User", schema);
