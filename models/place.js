const mongoose = require("mongoose"),
  Schema = mongoose.Schema;

//TODO: Add a chatroom here somehow...
//TODO: Also add address
//FIXME: Add schema version to update schema accordingly
const schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, default: "Unknown" },
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
    checkedInUsers: { type: Array, default: [] },
  },
  {
    timestamps: true,
    collection: "markers",
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
