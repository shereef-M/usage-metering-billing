require('dotenv').config();
const connectDB = require('../config/db');
const Tier = require('../models/Tier');

const run = async () => {
  await connectDB();
  await Tier.updateOne({ name: 'free' }, { monthlyTokenQuota: 20 });
  console.log('Free tier quota lowered to 20 tokens for testing');
  process.exit(0);
};

run();