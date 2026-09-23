const UsageRecord = require("../models/UsageRecord");
const { getCurrentBillingPeriod } = require("./quotaService");

const getInvoiceData = async (user, period) => {
  const billingPeriod = period || getCurrentBillingPeriod();

  const records = await UsageRecord.find({
    user: user._id,
    billingPeriod,
    status: "recorded",
  }).sort({ createdAt: 1 });

  const totalTokens = records.reduce(
    (sum, r) => sum + r.inputTokens + r.outputTokens,
    0,
  );
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

  return {
    billingPeriod,
    user: { name: user.name, email: user.email, tier: user.tier },
    totalRequests: records.length,
    totalTokens,
    totalCost,
    lineItems: records.map((r) => ({
      date: r.createdAt,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cost: r.cost,
    })),
  };
};

const toCsv = (invoice) => {
  const header = "date,model,inputTokens,outputTokens,cost\n";
  const rows = invoice.lineItems
    .map(
      (item) =>
        `${item.date.toISOString()},${item.model},${item.inputTokens},${item.outputTokens},${item.cost}`,
    )
    .join("\n");
  const summary = `\n\nTotal Requests,${invoice.totalRequests}\nTotal Tokens,${invoice.totalTokens}\nTotal Cost,${invoice.totalCost}`;
  return header + rows + summary;
};

module.exports = { getInvoiceData, toCsv };
