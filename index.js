import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import cron from 'cron';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const sofascoreApi = process.env.SOFASCORE_API;
const channelUsername = process.env.CHANNEL_USERNAME;

let paidPostTime = null;
let motivatingInterval = null;

// Motivational quotes
const motivationalQuotes = [
  "Believe in yourself! Today's team will rock it!",
  "Champions are made before the match starts!",
  "Your hustle will pay off — stay positive!",
  "Another day, another winning lineup!"
];

// Morning greetings
const morningQuotes = [
  "Good morning champs! Ready to dominate today?",
  "New day, new chances! Let's make it count.",
  "Stay focused and trust your fantasy instincts!",
  "Victory loves preparation! Morning vibes."
];

// 4:30AM Morning message
new cron.CronJob('30 4 * * *', async () => {
  const randomMessage = morningQuotes[Math.floor(Math.random() * morningQuotes.length)];
  await bot.sendMessage(channelUsername, `☀️ ${randomMessage}`);
}, null, true, 'Asia/Kolkata');

// Listen to all channel posts
bot.on('channel_post', async (msg) => {
  const text = msg.text || '';
  const messageId = msg.message_id;
  
  // Detect paid post
  if (text.includes('Rigi Users') || text.includes('Unlock')) {
    paidPostTime = Date.now();
    startMotivationLoop(msg.chat.id, messageId);
  }
  
  // Detect free post
  if (text.includes('Open Team') || text.includes('open') || text.includes('free')) {
    await fetchAndSendLineup(msg.chat.id, text);
  }
});

// Start sending motivation every 5 min for 35 min
function startMotivationLoop(chatId, messageId) {
  if (motivatingInterval) clearInterval(motivatingInterval);
  
  motivatingInterval = setInterval(async () => {
    const now = Date.now();
    if (now - paidPostTime > 35 * 60 * 1000) {
      clearInterval(motivatingInterval);
      motivatingInterval = null;
      return;
    }
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    await bot.sendMessage(chatId, `✨ Motivation Box:\n${quote}`, { reply_to_message_id: messageId });
  }, 5 * 60 * 1000);
}

// Fetch lineup and stats for free matches
async function fetchAndSendLineup(chatId, searchText) {
  try {
    const response = await axios.get(`${sofascoreApi}sport/football/events/live`);
    const events = response.data.events || [];

    for (const event of events) {
      const team1 = event.homeTeam.name.toLowerCase();
      const team2 = event.awayTeam.name.toLowerCase();
      
      if (searchText.toLowerCase().includes(team1) || searchText.toLowerCase().includes(team2)) {
        const matchTime = new Date(event.startTimestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const lineupAvailable = event.lineupsAvailable || false;
        
        let message = `⚽ Match: ${event.homeTeam.name} vs ${event.awayTeam.name}\n`;
        message += `⏰ Kickoff: ${matchTime}\n`;
        message += `\n${lineupAvailable ? '✅ Lineups Available!' : '❌ Lineups not yet released.'}`;

        await bot.sendMessage(chatId, message);
        break;
      }
    }
  } catch (err) {
    console.error('Error fetching lineup:', err.message);
  }
}
