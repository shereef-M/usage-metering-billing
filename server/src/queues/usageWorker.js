require("dotenv").config();
const { Worker } = require("bullmq");
const connection = require("../config/redisConnection");
const connectDB = require("../config/db");
const UsageRecord = require("../models/UsageRecord");
const User = require("../models/User");
const { checkAndCreateAlerts } = require("../services/alertService");

connectDB();

const worker = new Worker(
  "usage-recording",
  async (job) => {
    const {
      userId,
      requestId,
      model,
      inputTokens,
      outputTokens,
      cost,
      responseText,
      billingPeriod,
    } = job.data;

    await UsageRecord.create({
      user: userId,
      requestId,
      model,
      inputTokens,
      outputTokens,
      cost,
      responseText,
      billingPeriod,
    });

    console.log(`Usage recorded: ${requestId}`);

    // Check quota thresholds after recording usage
    const user = await User.findById(userId);
    if (user) {
      await checkAndCreateAlerts(user._id, user.tier, billingPeriod);
    }
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection in worker:", err.message);
});

console.log("Usage worker started");
