// slack-openai.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { WebClient } from '@slack/web-api';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Verify Slack request signature
const verifySlackRequest = (request: VercelRequest): boolean => {
  // In a production environment, you should verify the request signature
  // using crypto and the signing secret from Slack
  return true;
};

// Main handler function
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Verify request is from Slack
  if (!verifySlackRequest(request)) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  // Handle Slack URL verification
  if (request.body.type === 'url_verification') {
    return response.status(200).json({ challenge: request.body.challenge });
  }

  const event = request.body.event;

  // Only process messages that mention the bot
  if (event.type === 'app_mention') {
    try {
      // Create thread with OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant responding to Slack messages. Keep responses concise and professional."
          },
          {
            role: "user",
            content: event.text.replace(/<@.*?>/g, '').trim() // Remove mention from message
          }
        ],
      });

      // Send response back to Slack
      await slack.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts || event.ts,
        text: completion.choices[0].message.content || "I couldn't process that request."
      });

      return response.status(200).json({ message: 'OK' });
    } catch (error) {
      console.error('Error:', error);
      return response.status(500).json({ error: 'Failed to process message' });
    }
  }

  return response.status(200).json({ message: 'OK' });
}