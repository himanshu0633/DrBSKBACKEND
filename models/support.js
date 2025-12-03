const mongoose = require("mongoose");

const supportSchema = mongoose.Schema(
  {
    email: { type: String },
    name: { type: String },
    phone: { type: String },
    description: { type: String },
    deleted_at : { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Support", supportSchema);
