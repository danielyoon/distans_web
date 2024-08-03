const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  id: { type: String, unique: true, required: true },
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  image: String,
  punches: Number,
  expiry: Date,
});

module.exports = mongoose.model("Coupon", schema);
