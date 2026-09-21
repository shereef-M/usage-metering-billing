const Tier = require("../models/Tier");
const UsageRecord = require("../models/UsageRecord");

const getCurrentBillingPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getUsageThisPeriod = async (userId) => {
  const billingPeriod = getCurrentBillingPeriod();

  const result = await UsageRecord.aggregate([
    { $match: { user: userId, billingPeriod, status: "recorded" } },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalTokens : 0;
};

const checkQuota = async (user, tier) => {
  if (!tier) {
    tier = await Tier.findOne({ name: user.tier });
  }

  if (!tier) {
    throw new Error(`Unknown tier: ${user.tier}`);
  }

  const usedTokens = await getUsageThisPeriod(user._id);
  const remaining = tier.monthlyTokenQuota - usedTokens;

  if (remaining > 0) {
    return { allowed: true, willOverage: false, usedTokens, tier };
  }

  if (tier.overagePolicy === "allow-overage") {
    return { allowed: true, willOverage: true, usedTokens, tier };
  }

  if (tier.overagePolicy === "grace-window") {
    const overBy = usedTokens - tier.monthlyTokenQuota;
    if (overBy < tier.graceWindowTokens) {
      return { allowed: true, willOverage: true, usedTokens, tier };
    }
    return { allowed: false, usedTokens, tier };
  }

  return { allowed: false, usedTokens, tier };
};

module.exports = { checkQuota, getCurrentBillingPeriod };
