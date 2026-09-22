const Alert = require('../models/Alert');
const Tier = require('../models/Tier');
const UsageRecord = require('../models/UsageRecord');

const THRESHOLDS = [80, 100];

const checkAndCreateAlerts = async (userId, userTierName, billingPeriod) => {
  const tier = await Tier.findOne({ name: userTierName });
  if (!tier) return;

  const result = await UsageRecord.aggregate([
    { $match: { user: userId, billingPeriod, status: 'recorded' } },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
  ]);

  const usedTokens = result.length > 0 ? result[0].totalTokens : 0;
  const percentUsed = (usedTokens / tier.monthlyTokenQuota) * 100;

  for (const threshold of THRESHOLDS) {
    if (percentUsed >= threshold) {
      try {
        await Alert.create({
          user: userId,
          billingPeriod,
          threshold,
          usedTokens,
          quota: tier.monthlyTokenQuota,
        });
        console.log(`Alert created: user ${userId} crossed ${threshold}% (${usedTokens}/${tier.monthlyTokenQuota})`);
      } catch (err) {
        // Duplicate key error means this alert already exists — expected, not a real error
        if (err.code !== 11000) {
          console.error('Alert creation error:', err.message);
        }
      }
    }
  }
};

module.exports = { checkAndCreateAlerts };