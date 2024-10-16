// Import necessary packages
const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

const openAiApiKey = process.env.OPENAI_API_KEY;

// Initialize Bolt App using Vercel's serverless structure
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,  // Slack bot token
  signingSecret: process.env.SLACK_SIGNING_SECRET,  // Slack signing secret
});

// Main event handler for messages
app.message(async ({ message, say }) => {
  try {
    // Construct the OpenAI prompt
    const preprompt = [
      { role: 'system', content: "You are an IT Support Agent. Respond to queries related to IT tasks, and answer in under 50 words." },
      { role: 'user', content: message.text }
    ];

    // Send the message to OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: preprompt,
      max_tokens: 50,  // Limit the response size
    }, {
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      }
    });

    // Send the OpenAI response back to Slack
    const openAiReply = response.data.choices[0].message.content;
    await say(openAiReply);

  } catch (error) {
    console.error('Error:', error.message);
    await say('There was an issue with the request. Please try again later.');
  }
});

// Expose the app through Vercel's serverless function
module.exports = async (req, res) => {
  await app.start();
  res.status(200).send('Bot is running.');
};
