import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const channelId = '@haazaprime'; // your main channel username

const paidPosts = new Map(); // track paid posts
const openPosts = new Map(); // track open posts
const motivationImages = []; // skip if no images

// Function to identify paid or open
function detectPostType(text) {
  if (!text) return null;
  if (text.includes('Rpy') || text.includes('rpy')) return 'paid';
  if (text.includes('Ready') || text.includes('Open') || text.includes('open')) return 'open';
  return null;
}

// Watch new posts
bot.on('channel_post', async (ctx) => {
  try {
    const post = ctx.channelPost;
    const type = detectPostType(post.caption || post.text);

    if (type === 'paid') {
      paidPosts.set(post.message_id, { chatId: post.chat.id, postedAt: Date.now() });
      await ctx.reply('Paid team posted. Users hurry up and grab your win ticket!');
      motivatePaid(ctx, post.message_id);
    } else if (type === 'open') {
      openPosts.set(post.message_id, { chatId: post.chat.id, postedAt: Date.now() });
      await ctx.reply('Open team shared! Let’s smash today’s match!');
      fetchMatchStats(ctx);
    }
  } catch (error) {
    console.error('Error detecting post type:', error.message);
  }
});

// Function: Motivate paid users every 5 minutes
function motivatePaid(ctx, messageId) {
  const interval = setInterval(async () => {
    if (!paidPosts.has(messageId)) {
      clearInterval(interval);
      return;
    }

    const { postedAt } = paidPosts.get(messageId);
    if (Date.now() - postedAt > 35 * 60 * 1000) { // after 35 mins stop
      paidPosts.delete(messageId);
      clearInterval(interval);
      return;
    }

    await ctx.telegram.sendMessage(channelId, "Don't miss it! Last chance to grab your premium team and maximize winnings!");
  }, 5 * 60 * 1000);
}

// Function: Fetch match stats and lineups (for open posts)
async function fetchMatchStats(ctx) {
  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures?next=1', {
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY
      }
    });

    const match = response.data.response[0];
    if (!match) return;

    const home = match.teams.home.name;
    const away = match.teams.away.name;
    const status = match.fixture.status.short;

    if (status === 'NS') { // NS = Not Started
      const message = `Today's Match Preview:\n\n${home} vs ${away}\n\nGet ready for an exciting game! Stay tuned!`;
      await ctx.telegram.sendMessage(channelId, message);
    } else {
      console.log('Match already started, no preview sent.');
    }

  } catch (error) {
    console.error('Error fetching match stats:', error.message);
  }
}

// Cron Job: Delete paid post after match time
cron.schedule('* * * * *', async () => {
  const now = Date.now();
  for (const [msgId, { chatId, postedAt }] of paidPosts) {
    if (now - postedAt > 120 * 60 * 1000) { // 2 hours passed
      try {
        await bot.telegram.deleteMessage(chatId, msgId);
        paidPosts.delete(msgId);
        console.log(`Deleted paid post: ${msgId}`);
      } catch (error) {
        console.error('Error deleting paid post:', error.message);
      }
    }
  }
});

// Cron Job: Morning 4:30 AM wish
cron.schedule('30 4 * * *', async () => {
  const chats = Array.from(new Set([...paidPosts.values(), ...openPosts.values()])).map(x => x.chatId);

  for (const chatId of chats) {
    try {
      if (motivationImages.length > 0) {
        const imgPath = path.resolve(motivationImages[Math.floor(Math.random() * motivationImages.length)]);
        if (fs.existsSync(imgPath)) {
          await bot.telegram.sendPhoto(chatId, { source: imgPath }, { caption: "Good Morning! New day, new chances to win!" });
        } else {
          await bot.telegram.sendMessage(chatId, "Good Morning! New day, new chances to win!");
        }
      } else {
        await bot.telegram.sendMessage(chatId, "Good Morning! New day, new chances to win!");
      }
    } catch (error) {
      console.error('Error sending morning message:', error.message);
    }
  }
});

// Start bot
bot.launch();
console.log('HazaaPrimeAI Bot started!');
