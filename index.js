import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const motivationMessages = [
  "Stay strong! Today’s victory starts with belief!",
  "Push beyond limits — success is waiting for you!",
  "Every dream begins with a step — take it now!",
  "Champions keep playing until they get it right!",
  "Rise up and own your game today!",
  "Opportunities are endless for those who hustle!",
  "Success is earned, not given!",
  "Stay focused, stay hungry, stay positive!"
];

// To track active paid messages
let activePaidMessages = {};

// Function to send a random motivational message
async function sendMotivation(ctx, chatId) {
  const message = `🔥 ${motivationMessages[Math.floor(Math.random() * motivationMessages.length)]}`;
  await ctx.telegram.sendMessage(chatId, message);
}

// 4:30AM Morning Motivation
cron.schedule('0 4 * * *', async () => {
  try {
    const message = `🌟 Good Morning Champions! Keep your dreams big and your efforts bigger! 🔥`;
    await bot.telegram.sendMessage(process.env.CHANNEL_ID, message);
  } catch (error) {
    console.error('Error sending morning motivation:', error.message);
  }
}, {
  timezone: process.env.TIMEZONE
});

// Monitor new posts
bot.on('channel_post', async (ctx) => {
  const message = ctx.channelPost.text || ctx.channelPost.caption || "";

  const chatId = ctx.channelPost.chat.id;
  const postId = ctx.channelPost.message_id;

  // Paid Post Detection
  if (message.includes('Rpy') || message.includes('rpy')) {
    activePaidMessages[postId] = Date.now();

    // Send motivation every 5 minutes for 35 minutes
    let counter = 0;
    const interval = setInterval(async () => {
      counter += 5;
      if (counter > 35) {
        clearInterval(interval);
        delete activePaidMessages[postId];
      } else {
        await sendMotivation(ctx, chatId);
      }
    }, 5 * 60 * 1000);
  }

  // Open Team Detection
  if (message.toLowerCase().includes('ready') || message.toLowerCase().includes('open')) {
    // Fetch stats and lineups
    await postMatchStats(ctx, chatId);
  }
});

// Paid Post Deletion After Deadline
cron.schedule('*/1 * * * *', async () => {
  const now = Date.now();

  for (const [postId, postTime] of Object.entries(activePaidMessages)) {
    if (now - postTime > 35 * 60 * 1000) { // 35 mins timeout
      try {
        await bot.telegram.deleteMessage(process.env.CHANNEL_ID, postId);
        delete activePaidMessages[postId];
        console.log(`Deleted paid post ${postId}`);
      } catch (error) {
        console.error(`Failed to delete message ${postId}:`, error.message);
      }
    }
  }
}, {
  timezone: process.env.TIMEZONE
});

// Fetch SofaScore stats and lineups
async function postMatchStats(ctx, chatId) {
  try {
    const response = await axios.get(process.env.SOFASCORE_API_URL);
    const matches = response.data.events || [];

    if (matches.length > 0) {
      for (const match of matches) {
        const home = match.homeTeam.name;
        const away = match.awayTeam.name;
        const time = new Date(match.startTimestamp * 1000).toLocaleTimeString('en-IN', { timeZone: process.env.TIMEZONE });

        const statsMessage = `⚽ Upcoming Match: ${home} vs ${away}\n🕒 Time: ${time}\n🔥 Stay tuned for updates!`;
        await ctx.telegram.sendMessage(chatId, statsMessage);

        if (match.lineups && match.lineups.home && match.lineups.away) {
          const lineupMessage = `✅ Confirmed Lineups:\n\n${home}:\n${match.lineups.home.players.map(p => p.player.name).join(', ')}\n\n${away}:\n${match.lineups.away.players.map(p => p.player.name).join(', ')}`;
          await ctx.telegram.sendMessage(chatId, lineupMessage);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching SofaScore data:', error.message);
  }
}

bot.launch();
console.log('HazaaPrime AI Bot is running!');
