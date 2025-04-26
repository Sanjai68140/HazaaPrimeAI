import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const MAIN_CHANNEL_ID = process.env.MAIN_CHANNEL_ID;
const MOTIVATION_INTERVAL_MINUTES = parseInt(process.env.MOTIVATION_INTERVAL_MINUTES);
const MORNING_MESSAGE_TIME = process.env.MORNING_MESSAGE_TIME;
const TIMEZONE = process.env.TIMEZONE;

let paidMessageIds = [];
let motivationIntervals = {};

const motivationQuotes = [
  "Believe in your team, believe in your dreams! ⚽🔥",
  "Winning starts with the right team. Let's go! 💪",
  "Hazaa Prime teams are pure magic. Make your move! ✨",
  "Victory loves preparation. Team posted, grab it fast! ✅",
  "Dream big, play bigger with HazaaPrime! ⚡",
];

const goodMorningMessages = [
  "Good Morning Champions! Let's dominate today's matches! ⚽☀️",
  "Wake up and win! New day, new opportunities! ⚡",
  "Morning Vibes: Trust HazaaPrime for the best teams! ❤️",
  "Rise & Shine! Game day starts now! ⏰⚽",
];

// --- Morning Message Scheduler ---
cron.schedule(`0 ${MORNING_MESSAGE_TIME.split(':')[1]} ${MORNING_MESSAGE_TIME.split(':')[0]} * * *`, async () => {
  const message = goodMorningMessages[Math.floor(Math.random() * goodMorningMessages.length)];
  await bot.telegram.sendMessage(MAIN_CHANNEL_ID, message);
}, { timezone: TIMEZONE });

// --- Watch Channel Posts ---
bot.on('channel_post', async (ctx) => {
  const post = ctx.channelPost;
  const text = post.text || post.caption || "";

  try {
    if (text.includes('Rpy') || text.includes('rpy')) {
      console.log('Paid Team Detected');

      // Paid Team Detected
      paidMessageIds.push(post.message_id);
      startMotivating(ctx, post.message_id);

    } else if (text.toLowerCase().includes('ready') || text.toLowerCase().includes('open')) {
      console.log('Open Team Detected');

      // Open Team Detected
      await sendOpenTeamStats(ctx);
    }
  } catch (error) {
    console.error('Error handling channel post:', error.message);
  }
});

// --- Motivating After Paid Post ---
function startMotivating(ctx, messageId) {
  const interval = setInterval(async () => {
    try {
      await ctx.telegram.sendMessage(MAIN_CHANNEL_ID, randomBoxedMotivation());
    } catch (err) {
      console.error('Motivation message error:', err.message);
    }
  }, MOTIVATION_INTERVAL_MINUTES * 60 * 1000);

  motivationIntervals[messageId] = interval;

  // Stop after 35 minutes
  setTimeout(() => {
    clearInterval(interval);
    delete motivationIntervals[messageId];
  }, 35 * 60 * 1000);
}

// --- Format Boxed Motivation ---
function randomBoxedMotivation() {
  const quote = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
  return `╔══════════╗\n${quote}\n╚══════════╝`;
}

// --- Send Open Team Stats + Lineups ---
async function sendOpenTeamStats(ctx) {
  try {
    const fixtureData = await getFixtureStatsFromSofascore();
    if (fixtureData) {
      const statsMessage = `
⚽ Match: ${fixtureData.home} vs ${fixtureData.away}
⏰ Start Time: ${fixtureData.startTime}
⭐ Prediction: ${fixtureData.prediction}
✅ Lineups: Available!
`;

      await ctx.telegram.sendMessage(MAIN_CHANNEL_ID, statsMessage);
    }
  } catch (err) {
    console.error('Error fetching open team stats:', err.message);
  }
}

// --- Get Fixture Stats from Sofascore ---
async function getFixtureStatsFromSofascore() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const response = await axios.get(`https://api.sofascore.com/api/v1/sport/football/events/live`);
    const events = response.data.events;

    for (const event of events) {
      if (event.startTimestamp > now && event.startTimestamp - now < 3600) {
        return {
          home: event.homeTeam.name,
          away: event.awayTeam.name,
          startTime: new Date(event.startTimestamp * 1000).toLocaleTimeString('en-IN', { timeZone: TIMEZONE }),
          prediction: "Tight Contest",  // Static prediction (can upgrade later)
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching from Sofascore:', err.message);
    return null;
  }
}

// --- Start Bot ---
bot.launch();
console.log('HazaaPrime AI Bot is Running...');
