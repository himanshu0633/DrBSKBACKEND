const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    variety: { type: String , required: true },
    name: { type: String , required: true },
    description: { type: String },
    image: { type: String },
    Subcategory_id: { type: mongoose.Schema.Types.ObjectId, ref: "ProductSubCategories" },
    deleted_at : { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductCategories", categorySchema);
