const redis = require("../config/redis");

const checkRateLimit = async (apiKey, limitPerMinute) => {
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${apiKey}:${currentMinute}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  return {
    allowed: count <= limitPerMinute,
    count,
    limit: limitPerMinute,
  };
};

module.exports = { checkRateLimit };
