const mongoose = require("mongoose");

const usageRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true, // enforces idempotency at the DB level
    },
    model: {
      type: String,
      required: true, // e.g. 'llama-3.3-70b-versatile'
    },
    inputTokens: {
      type: Number,
      required: true,
    },
    outputTokens: {
      type: Number,
      required: true,
    },
    cost: {
      type: Number,
      required: true, // computed cost for this request, in USD
    },
    billingPeriod: {
      type: String,
      required: true, // e.g. '2026-09', used to group usage by month
      index: true,
    },
    status: {
      type: String,
      enum: ["recorded", "failed"],
      default: "recorded",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UsageRecord", usageRecordSchema);
