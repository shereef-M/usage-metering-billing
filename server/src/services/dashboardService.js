const UsageRecord = require("../models/UsageRecord");
const Tier = require("../models/Tier");
const { getCurrentBillingPeriod } = require("./quotaService");

const getDashboard = async (user) => {
  const billingPeriod = getCurrentBillingPeriod();
  const tier = await Tier.findOne({ name: user.tier });

  const result = await UsageRecord.aggregate([
    { $match: { user: user._id, billingPeriod, status: "recorded" } },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
        totalCost: { $sum: "$cost" },
        requestCount: { $sum: 1 },
      },
    },
  ]);

  const usage =
    result.length > 0
      ? result[0]
      : { totalTokens: 0, totalCost: 0, requestCount: 0 };

  // Simple linear projection: (cost so far / days elapsed) * days in month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const projectedCost =
    dayOfMonth > 0
      ? (usage.totalCost / dayOfMonth) * daysInMonth
      : usage.totalCost;

  return {
    billingPeriod,
    tier: user.tier,
    quota: tier.monthlyTokenQuota,
    usedTokens: usage.totalTokens,
    remainingTokens: Math.max(tier.monthlyTokenQuota - usage.totalTokens, 0),
    percentUsed: Number(
      ((usage.totalTokens / tier.monthlyTokenQuota) * 100).toFixed(1),
    ),
    totalCost: usage.totalCost,
    projectedCost,
    requestCount: usage.requestCount,
  };
};

module.exports = { getDashboard };
