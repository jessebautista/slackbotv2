const axios = require('axios');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slackClient = new WebClient(process.env.SLACK_TOKEN);
const openaiApiKey = process.env.OPENAI_API_KEY;

// System instructions for OpenAI
const systemInstructions = `You are my avatar, every time someone sends a message, you'll review the message and check if it pertains to us. Our current role is IT Support for website and IT tasks. Never identify yourself as AI. Respond like a human in a respectful manner. Add a delay for realism. Keep responses under 30 words. Confirm tasks with 'Understood' or 'Got it'. Only respond when the message is relevant to IT Support tasks.`;

// Utility to introduce a delay (between 30 sec and 2 minutes)
function delayResponse(messageLength) {
  return new Promise(resolve => {
    const delay = Math.min(120, Math.max(30, messageLength / 2)); // 30 sec to 2 min
    setTimeout(resolve, delay * 1000);
  });
}

// Vercel Serverless function handler
module.exports = async (req, res) => {
  console.log('Incoming request:', req.body);  // Log incoming request for debugging

  // Handle Slack's challenge verification request
  if (req.body.type === 'url_verification') {
    console.log('Handling challenge verification');
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const { event } = req.body;

  // Log the event object for debugging
  console.log('Event object:', event);

  // Send a 200 OK response to Slack immediately to prevent timeout
  res.status(200).send('Message received. Processing...');

  const messageLength = event.text.length;

  // Introduce a delay for realism
  await delayResponse(messageLength);

  // Continue processing the OpenAI response asynchronously
  try {
    console.log('Sending request to OpenAI');
    const openAIResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
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
        },
        timeout: 10000  // Add a timeout to avoid long waits (10 seconds)
      }
    );

    console.log('OpenAI response:', openAIResponse.data);

    const botReply = openAIResponse.data.choices[0].message.content;

    // Send the reply back to Slack asynchronously
    await slackClient.chat.postMessage({
      channel: event.channel,
      text: botReply,
    });

    console.log('Message sent to Slack');
  } catch (error) {
    console.error('Error while communicating with OpenAI:', error.message);
    if (error.response) {
        console.error('Error details:', error.response.data);  // Log detailed error response
    }
  }
};
