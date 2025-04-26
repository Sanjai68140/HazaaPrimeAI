import { getRandomMotivation } from './motivator.js';
import { getLiveFootballMatches, getMatchLineup } from './sofascore.js';
import schedule from 'node-schedule';
import dotenv from 'dotenv';

dotenv.config();

let motivationTimers = {};
let monitoredMessages = {};

export function startSchedulers(bot) {
  
  bot.on('channel_post', async (ctx) => {
    try {
      const message = ctx.update.channel_post;
      const text = message.text || '';
      const caption = message.caption || '';

      const combinedText = `${text} ${caption}`;

      // Detect Paid Post
      if (combinedText.includes('rpy') || combinedText.includes('Rpy')) {
        startMotivation(bot, message.chat.id, message.message_id);
      }

      // Detect Open Post
      else if (combinedText.toLowerCase().includes('ready') || combinedText.toLowerCase().includes('open')) {
        postOpenTeamStats(bot, message.chat.id);
      }
    } catch (err) {
      console.error('Error handling channel post:', err.message);
    }
  });

  // Morning Motivation 4:30 AM
  schedule.scheduleJob(process.env.MORNING_MOTIVATION_TIME.split(":").map(Number), async () => {
    try {
      const matches = await getLiveFootballMatches();
      for (const match of matches) {
        const chatId = '@haazaprime'; // Main channel (modify if needed)
        const motivationText = getRandomMotivation();
        await bot.telegram.sendMessage(chatId, motivationText);
      }
    } catch (error) {
      console.error('Error sending morning motivation:', error.message);
    }
  });

  // Lineup Checker (Every 1 minute)
  setInterval(async () => {
    try {
      const matches = await getLiveFootballMatches();
      const currentTime = Date.now();
      for (const match of matches) {
        const startTimestamp = match.startTimestamp * 1000;
        const diffMinutes = (startTimestamp - currentTime) / 60000;

        if (diffMinutes <= 30 && diffMinutes >= 0) {
          const lineup = await getMatchLineup(match.id);
          if (lineup && lineup.home && lineup.away) {
            const lineupText = `✅ **Official Lineups Out!**\n\n🏟️ ${match.homeTeam.name} vs ${match.awayTeam.name}\n\nCheck and update your fantasy picks now!`;
            await bot.telegram.sendMessage('@haazaprime', lineupText, { parse_mode: 'Markdown' });
          }
        }
      }
    } catch (error) {
      console.error('Error checking lineups:', error.message);
    }
  }, 60000);
}

function startMotivation(bot, chatId, messageId) {
  if (motivationTimers[messageId]) return; // Already started

  let count = 0;
  const timer = setInterval(async () => {
    if (count >= 7) { // 5 min * 7 = 35 min approx
      clearInterval(timer);
      delete motivationTimers[messageId];
    } else {
      const motivationText = getRandomMotivation();
      await bot.telegram.sendMessage(chatId, motivationText);
      count++;
    }
  }, 300000); // every 5 minutes

  motivationTimers[messageId] = timer;
}

async function postOpenTeamStats(bot, chatId) {
  try {
    const matches = await getLiveFootballMatches();
    if (matches.length > 0) {
      const match = matches[0];
      const statsText = `⚽ **Today's Big Match:**\n\n${match.homeTeam.name} vs ${match.awayTeam.name}\n\nDon't miss to pick your legends!`;
      await bot.telegram.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error posting open team stats:', error.message);
  }
}
