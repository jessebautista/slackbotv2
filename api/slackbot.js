const axios = require('axios');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slackClient = new WebClient(process.env.SLACK_TOKEN);
const openaiApiKey = process.env.OPENAI_API_KEY;

let lastRequestTime = 0;  // Track last request time for rate limiting

// Function to delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get OpenAI response with rate limiting
async function getOpenAIResponse(prompt) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < 10000) {
    await delay(10000 - timeSinceLastRequest);  // Wait the remaining time if requests are too frequent
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: prompt,  // Pass prompt structure
      max_tokens: 50,
    }, {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    lastRequestTime = Date.now();  // Update last request time
    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log('Rate limit hit. Retrying after a short wait...');
      await delay(1000);  // Wait 1 second and retry
      return getOpenAIResponse(prompt);
    }
    console.error('Error fetching response from OpenAI:', error);
    throw error;
  }
}

// Main handler function
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { type, challenge, event } = req.body;

    // Respond to Slack's URL verification challenge
    if (type === 'url_verification') {
      return res.status(200).send(challenge);
    }

    // Handle incoming messages
    if (event && event.type === 'message' && !event.subtype) {
      const { text, channel } = event;

      // Prepare OpenAI prompt
      const preprompt = [
        { role: 'system', content: "You are an IT Support Agent. Respond only to messages related to our website or app. Ask probing questions if the task is unclear. Keep responses under 50 words." },
        { role: 'user', content: text }
      ];

      try {
        const reply = await getOpenAIResponse(preprompt);
        await slackClient.chat.postMessage({ channel, text: reply });
      } catch (error) {
        await slackClient.chat.postMessage({
          channel,
          text: 'There was an error processing your request. Please try again later.'
        });
      }
    }

    // Respond with 200 OK for all other requests
    res.status(200).send('OK');
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).send(`Method ${req.method} Not Allowed`);
  }
};
