const mongoose = require("mongoose");

const tierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "pro", "enterprise"],
    },
    monthlyTokenQuota: {
      type: Number,
      required: true,
    },
    rateLimitPerMinute: {
      type: Number,
      required: true,
    },
    overagePricePerToken: {
      type: Number,
      required: true, // in USD (or your chosen unit), applied only if overage is allowed
    },
    overagePolicy: {
      type: String,
      enum: ["hard-block", "grace-window", "allow-overage"],
      default: "hard-block",
    },
    graceWindowTokens: {
      type: Number,
      default: 0, // extra tokens allowed before hard-block, if policy is grace-window
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tier", tierSchema);
