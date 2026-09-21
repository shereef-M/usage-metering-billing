const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g. 'llama-3.3-70b-versatile'
    },
    provider: {
      type: String,
      default: "groq",
    },
    inputPricePerToken: {
      type: Number,
      required: true, // cost per input token, in USD
    },
    outputPricePerToken: {
      type: Number,
      required: true, // cost per output token, in USD
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Model", modelSchema);
