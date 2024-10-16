const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

// Initialize the Bolt App (no receiver, as we'll handle events manually)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,  // Slack bot token
  signingSecret: process.env.SLACK_SIGNING_SECRET,  // Slack signing secret
});

// OpenAI API Key
const openAiApiKey = process.env.OPENAI_API_KEY;

// Message event handler
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
      max_tokens: 50,
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

// Vercel Serverless Function Handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      // Process the event from Slack
      await app.processEvent(req.body);
      res.status(200).send('Event processed');
    } catch (error) {
      console.error('Error processing event:', error);
      res.status(500).send('Error processing event');
    }
  } else {
    res.status(405).send({ message: 'Only POST requests allowed' });
  }
};
