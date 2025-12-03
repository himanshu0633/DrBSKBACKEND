const mongoose = require("mongoose");

const newarrivalSchema = mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    image: { type: String },
    retail_price: { type: String },
    consumer_price: { type: String },
    discount: { type: String },
    mrp: { type: String },
    quantity: { type: String },
    category: { type: String },
    sub_category: { type: String },
    expires_on: { type: String },
    suitable_for: { type: String },
    benefits: { type: String },
    dosage: { type: String },
    side_effects: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewArrivalProduct", newarrivalSchema);
