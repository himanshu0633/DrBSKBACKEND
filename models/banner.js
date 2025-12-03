const mongoose = require("mongoose");

const bannerSchema = mongoose.Schema(
  {
    type: { type: String, required: true },
    slider_image: [{ type: String }],
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DashboardBanner", bannerSchema);
