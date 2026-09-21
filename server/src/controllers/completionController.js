const { callGroq } = require("../services/groqService");
const { calculateCost } = require("../services/costService");
const UsageRecord = require("../models/UsageRecord");
const crypto = require("crypto");

const createCompletion = async (req, res) => {
  try {
    const { model, prompt } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: "model and prompt are required" });
    }

    // Call Groq
    const result = await callGroq(model, prompt);

    // Calculate cost
    const cost = await calculateCost(
      model,
      result.inputTokens,
      result.outputTokens,
    );

    // Record usage
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await UsageRecord.create({
      user: req.user._id,
      requestId: crypto.randomUUID(),
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
      billingPeriod,
    });

    res.json({
      response: result.content,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createCompletion };
