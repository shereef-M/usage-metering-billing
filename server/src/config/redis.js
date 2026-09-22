const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000); // backoff, capped at 5s
    return delay;
  },
});

connection.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

module.exports = connection;
