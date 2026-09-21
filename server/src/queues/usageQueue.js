const { Queue } = require("bullmq");
const connection = require("../config/redisConnection");

const usageQueue = new Queue("usage-recording", { connection });

module.exports = usageQueue;
