const mongoose = require("mongoose"),
  Schema = mongoose.Schema;

const schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, default: "Unknown" },
    isPrivate: Boolean,
    approved: { type: Boolean, default: false },
    requestedBy: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
      },
    },
    users: { type: Array, default: [] },
    capacity: Number,
    eta: { type: Array, default: [] },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collection: "places",
  }
);

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  },
});

schema.index({ location: "2dsphere" });
module.exports = mongoose.model("Place", schema);
