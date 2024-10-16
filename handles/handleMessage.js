const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendMessage } = require('./sendMessage');

const commands = new Map();
const prefix = '/';

const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name.toLowerCase(), command);
}

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;
  const messageText = event.message.text.trim().toLowerCase();

  // Check if the message contains the word "prefix"
  if (messageText.includes('prefix')) {
    sendMessage(senderId, { text: `prefix is "${prefix}"` }, pageAccessToken);
    return;
  }

  // Check if the message contains the word "ai"
  if (messageText.startsWith('ai')) {
    const query = messageText.slice(2).trim(); // Extract the query after "ai"
    const apiUrl = `https://www.samirxpikachu.run.place/gpt?content=${encodeURIComponent(query)}`;

    try {
      // Request the GPT API with the extracted query
      const response = await axios.get(apiUrl);
      const gptResponse = response.data.message.content;

      // Send the response back to the user
      sendMessage(senderId, { text: gptResponse }, pageAccessToken);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      sendMessage(senderId, { text: 'There was an error fetching the AI response.' }, pageAccessToken);
    }
    return;
  }

  if (messageText.startsWith(prefix)) {
    const args = messageText.slice(prefix.length).split(' ');
    const commandName = args.shift().toLowerCase();

    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      try {
        await command.execute(senderId, args, pageAccessToken, sendMessage);
      } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        sendMessage(senderId, { text: 'There was an error executing that command.' }, pageAccessToken);
      }
    }
    return;
  }

  const aiCommand = commands.get('ai');
  if (aiCommand) {
    try {
      await aiCommand.execute(senderId, messageText, pageAccessToken, sendMessage);
    } catch (error) {
      console.error('Error executing Ai command:', error);
      sendMessage(senderId, { text: 'There was an error processing your request.' }, pageAccessToken);
    }
  }
}

module.exports = { handleMessage };
