const UsageRecord = require("../models/UsageRecord");
const User = require("../models/User");
const { getCurrentBillingPeriod } = require("./quotaService");

const getAdminSummary = async () => {
  const billingPeriod = getCurrentBillingPeriod();

  // Total revenue and requests this period, across all users
  const totals = await UsageRecord.aggregate([
    { $match: { billingPeriod, status: "recorded" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$cost" },
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
      },
    },
  ]);

  // Top users by usage this period
  const topUsersRaw = await UsageRecord.aggregate([
    { $match: { billingPeriod, status: "recorded" } },
    {
      $group: {
        _id: "$user",
        totalCost: { $sum: "$cost" },
        totalTokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
        requestCount: { $sum: 1 },
      },
    },
    { $sort: { totalCost: -1 } },
    { $limit: 10 },
  ]);

  // Attach user names/emails to the top users list
  const userIds = topUsersRaw.map((u) => u._id);
  const users = await User.find({ _id: { $in: userIds } }).select(
    "name email tier",
  );
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  const topUsers = topUsersRaw.map((u) => ({
    userId: u._id,
    name: userMap[u._id.toString()]?.name || "Unknown",
    email: userMap[u._id.toString()]?.email || "Unknown",
    tier: userMap[u._id.toString()]?.tier || "Unknown",
    totalCost: u.totalCost,
    totalTokens: u.totalTokens,
    requestCount: u.requestCount,
  }));

  const summary =
    totals.length > 0
      ? totals[0]
      : { totalRevenue: 0, totalRequests: 0, totalTokens: 0 };

  return {
    billingPeriod,
    totalRevenue: summary.totalRevenue,
    totalRequests: summary.totalRequests,
    totalTokens: summary.totalTokens,
    topUsers,
  };
};

module.exports = { getAdminSummary };
