const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  name: { type: String, unique: true, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  image: String,
  punches: Number,
  expiry: Date,
  isAppCoupon: { type: Boolean, required: true },
  isUsed: { type: Boolean, default: false },
});

module.exports = mongoose.model("Coupon", schema);
