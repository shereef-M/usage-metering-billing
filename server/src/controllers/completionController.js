const { callGroq } = require('../services/groqService');
const { calculateCost } = require('../services/costService');
const { checkQuota, getCurrentBillingPeriod } = require('../services/quotaService');
const { checkRateLimit } = require('../services/rateLimitService');
const Tier = require('../models/Tier');
const UsageRecord = require('../models/UsageRecord');
const usageQueue = require('../queues/usageQueue');
const redis = require('../config/redis');
const crypto = require('crypto');

const createCompletion = async (req, res) => {
  try {
    const { model, prompt } = req.body;
    const idempotencyKey = req.header('Idempotency-Key');

    if (!model || !prompt) {
      return res.status(400).json({ error: 'model and prompt are required' });
    }

    // Fast idempotency check — Redis marker first (covers in-flight/queued requests)
    if (idempotencyKey) {
      const cachedKey = `idempotency:${idempotencyKey}`;
      const cached = await redis.get(cachedKey);

      if (cached) {
        return res.json({ ...JSON.parse(cached), idempotent: true });
      }

      // Fallback: check Mongo in case the record was already written by the worker
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
    const rateLimit = await checkRateLimit(req.user.apiKey, tier.rateLimitPerMinute);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: rateLimit.limit,
        count: rateLimit.count,
      });
    }

    // Quota check
    const quota = await checkQuota(req.user, tier);

    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Quota exceeded',
        usedTokens: quota.usedTokens,
        quota: quota.tier.monthlyTokenQuota,
      });
    }

    // Call Groq
    const result = await callGroq(model, prompt);

    // Calculate cost
    const cost = await calculateCost(model, result.inputTokens, result.outputTokens);

    const billingPeriod = getCurrentBillingPeriod();
    const requestId = idempotencyKey || crypto.randomUUID();

    const responsePayload = {
      response: result.content,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost,
        willOverage: quota.willOverage,
      },
    };

    // Set a fast Redis marker immediately, so a rapid retry is caught before the worker finishes
    if (idempotencyKey) {
      await redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(responsePayload), { ex: 3600 });
    }

    // Enqueue the actual DB write instead of doing it inline
    await usageQueue.add('record-usage', {
      userId: req.user._id,
      requestId,
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost,
      responseText: result.content,
      billingPeriod,
    });

    res.json(responsePayload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createCompletion };