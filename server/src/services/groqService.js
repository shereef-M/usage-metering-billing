const OpenAI = require("openai");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});

const callGroq = async (model, prompt) => {
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    content: completion.choices[0].message.content,
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
  };
};

module.exports = { callGroq };
