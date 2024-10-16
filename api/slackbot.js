const axios = require('axios');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slackClient = new WebClient(process.env.SLACK_TOKEN);
const openaiApiKey = process.env.OPENAI_API_KEY;

// System instructions for OpenAI
const systemInstructions = `You are my avatar, every time someone sends a message, you'll review the message and check if it pertains to us. Our current role is IT Support for website and IT tasks. Never identify yourself as AI. Respond like a human in a respectful manner. Respond only when tagged. Add a delay for realism. Keep responses under 30 words. Confirm tasks with 'Understood' or 'Got it'.`;

// Utility to introduce a delay (between 30 sec and 2 minutes)
function delayResponse(messageLength) {
  return new Promise(resolve => {
    const delay = Math.min(120, Math.max(30, messageLength / 2)); // 30 sec to 2 min
    setTimeout(resolve, delay * 1000);
  });
}

// Vercel Serverless function handler
module.exports = async (req, res) => {
    console.log('Incoming request:', req.body);  // Log the incoming request body
    
    // Handle Slack's challenge verification request
    if (req.body.type === 'url_verification') {
      console.log('Handling challenge verification');
      return res.status(200).json({ challenge: req.body.challenge });
    }

  const { event } = req.body;

  if (!event || !event.text || !event.text.includes(`<@${process.env.BOT_USER_ID}>`)) {
    return res.status(200).send(); // Ignore if not tagged
  }

  const messageLength = event.text.length;

  // Introduce a delay for realism
  await delayResponse(messageLength);

  try {
    // Query OpenAI with the system instructions and user message
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',  // Or 'gpt-4'
        messages: [
          {
            role: 'system',
            content: systemInstructions
          },
          {
            role: 'user',
            content: event.text
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const botReply = openAIResponse.data.choices[0].message.content;

    // Send response back to Slack
    await slackClient.chat.postMessage({
      channel: event.channel,
      text: botReply,
    });

    return res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('Internal Server Error');
  }
};
