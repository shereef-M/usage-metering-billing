const Model = require("../models/Model");

const calculateCost = async (modelName, inputTokens, outputTokens) => {
  const model = await Model.findOne({ name: modelName, isActive: true });

  if (!model) {
    throw new Error(`Unknown or inactive model: ${modelName}`);
  }

  const cost =
    inputTokens * model.inputPricePerToken +
    outputTokens * model.outputPricePerToken;

  return cost;
};

module.exports = { calculateCost };
