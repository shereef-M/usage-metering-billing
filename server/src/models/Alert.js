const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    billingPeriod: {
      type: String,
      required: true,
    },
    threshold: {
      type: Number,
      required: true, // e.g. 80 or 100 (percent)
    },
    usedTokens: {
      type: Number,
      required: true,
    },
    quota: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate alerts for the same user/period/threshold
alertSchema.index(
  { user: 1, billingPeriod: 1, threshold: 1 },
  { unique: true },
);

module.exports = mongoose.model("Alert", alertSchema);
