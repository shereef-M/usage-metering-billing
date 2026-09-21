const { encoding_for_model } = require("tiktoken");
const Model = require("../models/Model");

const DEFAULT_ESTIMATED_OUTPUT_TOKENS = 256;

// Create the encoder once and reuse it across requests, instead of
// paying the setup cost on every call
const enc = encoding_for_model("gpt-4");

const countInputTokens = (prompt) => {
  const tokens = enc.encode(prompt);
  return tokens.length;
};

const estimateCost = async (modelName, prompt, maxTokens) => {
  const model = await Model.findOne({ name: modelName, isActive: true });

  if (!model) {
    throw new Error(`Unknown or inactive model: ${modelName}`);
  }

  const inputTokens = countInputTokens(prompt);
  const estimatedOutputTokens = maxTokens || DEFAULT_ESTIMATED_OUTPUT_TOKENS;

  const estimatedCost =
    inputTokens * model.inputPricePerToken +
    estimatedOutputTokens * model.outputPricePerToken;

  return {
    inputTokens,
    estimatedOutputTokens,
    estimatedCost,
  };
};

module.exports = { estimateCost };
