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
    const idempotencyKey = req.header("Idempotency-Key");

    if (!model || !prompt) {
      return res.status(400).json({ error: "model and prompt are required" });
    }

    // If this exact request was already processed, return the cached result
    if (idempotencyKey) {
      const existing = await UsageRecord.findOne({ requestId: idempotencyKey });
      if (existing) {
        return res.json({
          response: existing.responseText,
          usage: {
            inputTokens: existing.inputTokens,
            outputTokens: existing.outputTokens,
            cost: existing.cost,
            willOverage: false,
          },
          idempotent: true,
        });
      }
    }

    // Rate limit check
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

    // Quota check
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

    // Record usage — use client's idempotency key if provided, else generate one
    const billingPeriod = getCurrentBillingPeriod();
    const requestId = idempotencyKey || crypto.randomUUID();

    await UsageRecord.create({
      user: req.user._id,
      requestId,
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
      responseText: result.content,
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
