require("dotenv").config();
const { Worker } = require("bullmq");
const connection = require("../config/redisConnection");
const connectDB = require("../config/db");
const UsageRecord = require("../models/UsageRecord");

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
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

console.log("Usage worker started");
