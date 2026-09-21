require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Tier = require("../models/Tier");
const Model = require("../models/Model");

const seed = async () => {
  await connectDB();

  await Tier.deleteMany({});
  await Model.deleteMany({});

  await Tier.insertMany([
    {
      name: "free",
      monthlyTokenQuota: 50000,
      rateLimitPerMinute: 5,
      overagePricePerToken: 0,
      overagePolicy: "hard-block",
      graceWindowTokens: 0,
    },
    {
      name: "pro",
      monthlyTokenQuota: 1000000,
      rateLimitPerMinute: 30,
      overagePricePerToken: 0.0000015,
      overagePolicy: "grace-window",
      graceWindowTokens: 50000,
    },
    {
      name: "enterprise",
      monthlyTokenQuota: 10000000,
      rateLimitPerMinute: 120,
      overagePricePerToken: 0.000001,
      overagePolicy: "allow-overage",
      graceWindowTokens: 0,
    },
  ]);

  await Model.insertMany([
    {
      name: "llama-3.3-70b-versatile",
      provider: "groq",
      inputPricePerToken: 0.00000059,
      outputPricePerToken: 0.00000079,
    },
    {
      name: "llama-3.1-8b-instant",
      provider: "groq",
      inputPricePerToken: 0.00000005,
      outputPricePerToken: 0.00000008,
    },
  ]);

  console.log("Seed complete");
  process.exit(0);
};

seed();
