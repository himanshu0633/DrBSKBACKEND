const mongoose = require("mongoose");

const adminSchema = mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "User" }, // Default role set here
    name: { type: String },
    image: { type: String },
    phone: { type: String },
    address: { type: [String], default: [] },
    location: { type: String },
    timeStamp: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
