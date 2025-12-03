const mongoose = require("mongoose");

const prescriptionSchema = mongoose.Schema(
  {
     userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
    image: { type: String },
    deleted_at : { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescriptions", prescriptionSchema);
