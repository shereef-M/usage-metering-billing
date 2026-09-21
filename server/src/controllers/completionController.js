const { callGroq } = require("../services/groqService");
const { calculateCost } = require("../services/costService");
const {
  checkQuota,
  getCurrentBillingPeriod,
} = require("../services/quotaService");
const { checkRateLimit } = require("../services/rateLimitService");
const Tier = require("../models/Tier");
const UsageRecord = require("../models/UsageRecord");
const crypto = require("crypto");

const createCompletion = async (req, res) => {
  try {
    const { model, prompt } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: "model and prompt are required" });
    }

    // Rate limit check first — fastest, cheapest check
    const tier = await Tier.findOne({ name: req.user.tier });
    const rateLimit = await checkRateLimit(
      req.user.apiKey,
      tier.rateLimitPerMinute,
    );

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        limit: rateLimit.limit,
        count: rateLimit.count,
      });
    }

    // Quota check before calling Groq
    const quota = await checkQuota(req.user, tier);

    if (!quota.allowed) {
      return res.status(429).json({
        error: "Quota exceeded",
        usedTokens: quota.usedTokens,
        quota: quota.tier.monthlyTokenQuota,
      });
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
    const billingPeriod = getCurrentBillingPeriod();

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
        willOverage: quota.willOverage,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createCompletion };
