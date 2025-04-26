import { Telegraf } from 'telegraf';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const paidPosts = new Map(); // Track paid posts
const openPosts = new Map(); // Track open posts

// Morning motivation images path
const motivationImages = [
  'images/motivation1.jpg',
  'images/motivation2.jpg',
  // Add more images if needed
];

// Random casual messages
const casualTexts = [
  "Stay tuned champs, more magic coming!",
  "Dream big, play smart!",
  "Hope you all are ready for today's games!",
  "Let's win big today!",
];

// Listen to every new message
bot.on('channel_post', async (ctx) => {
  const text = ctx.channelPost.text || '';
  const caption = ctx.channelPost.caption || '';
  const content = text + caption;
  const postId = ctx.channelPost.message_id;
  const chatId = ctx.channelPost.chat.id;

  const timeNow = Date.now();

  // Detect paid post
  if (content.includes('Rpy') || content.includes('Unlock')) {
    console.log('Detected Paid Post');

    paidPosts.set(postId, { time: timeNow, chatId });

    motivatePaid(chatId, postId);
    stopMotivationAfter(chatId, postId, 35); // Stop after 35min
  }

  // Detect open post
  else if (content.includes('Open') || content.includes('Ready')) {
    console.log('Detected Open Team Post');

    openPosts.set(postId, { time: timeNow, chatId });

    const matchName = extractMatchName(content);
    if (matchName) {
      await postMatchStatsAndLineups(chatId, matchName);
    }
  }
});

// Function to motivate users after paid post
async function motivatePaid(chatId, postId) {
  const interval = setInterval(async () => {
    if (!paidPosts.has(postId)) {
      clearInterval(interval);
      return;
    }
    await bot.telegram.sendMessage(chatId, "Don't miss out! Unlock your winning team now!");
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Function to stop motivation after 35 min
function stopMotivationAfter(chatId, postId, minutes) {
  setTimeout(() => {
    paidPosts.delete(postId);
  }, minutes * 60 * 1000);
}

// Extract match name smartly
function extractMatchName(content) {
  const regex = /([A-Za-z\s]+vs[A-Za-z\s]+)/i;
  const match = content.match(regex);
  if (match) {
    return match[1];
  }
  return null;
}

// Fetch stats and lineups
async function postMatchStatsAndLineups(chatId, matchName) {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const response = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures`, {
      headers: {
        'X-RapidAPI-Key': process.env.API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      },
      params: { date: dateStr }
    });

    const fixtures = response.data.response;

    const fixture = fixtures.find(f =>
      `${f.teams.home.name} vs ${f.teams.away.name}`.toLowerCase().includes(matchName.toLowerCase())
    );

    if (!fixture) {
      console.log('No matching fixture found');
      return;
    }

    const fixtureId = fixture.fixture.id;

    const lineupResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/lineups`, {
      headers: {
        'X-RapidAPI-Key': process.env.API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      },
      params: { fixture: fixtureId }
    });

    if (!lineupResponse.data.response.length) {
      console.log('No lineup yet available');
      return; // No lineups, skip
    }

    const statsResponse = await axios.get(`https://api-football-v1.p.rapidapi.com/v3/fixtures/statistics`, {
      headers: {
        'X-RapidAPI-Key': process.env.API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      },
      params: { fixture: fixtureId }
    });

    const stats = statsResponse.data.response;

    let message = `⚽ Lineups for ${matchName}:\n`;

    lineupResponse.data.response.forEach(team => {
      message += `\n${team.team.name}:\n`;
      team.startXI.forEach(player => {
        message += `- ${player.player.name}\n`;
      });
    });

    if (stats.length > 0) {
      message += `\n\n📊 Match Stats:\n`;
      stats.forEach(teamStats => {
        message += `\n${teamStats.team.name}:\n`;
        teamStats.statistics.forEach(stat => {
          message += `- ${stat.type}: ${stat.value}\n`;
        });
      });
    }

    await bot.telegram.sendMessage(chatId, message);

  } catch (error) {
    console.error('Error fetching match stats/lineups:', error.message);
  }
}

// Delete paid messages after deadline (Already handled above)

// Morning 4:30 AM motivational message
cron.schedule('30 4 * * *', async () => {
  const channels = Array.from(new Set([...paidPosts.values(), ...openPosts.values()])).map(x => x.chatId);

  for (const chatId of channels) {
    const imgPath = path.resolve(motivationImages[Math.floor(Math.random() * motivationImages.length)]);
    await bot.telegram.sendPhoto(chatId, { source: imgPath }, { caption: "Good Morning! New day, new chances to win!" });
  }
});

// Casual talks every 5 hours if no activity
cron.schedule('0 */5 * * *', async () => {
  const channels = Array.from(new Set([...paidPosts.values(), ...openPosts.values()])).map(x => x.chatId);

  for (const chatId of channels) {
    await bot.telegram.sendMessage(chatId, casualTexts[Math.floor(Math.random() * casualTexts.length)]);
  }
});

bot.launch();
console.log('HazaaaprimeAI Bot is running...');
