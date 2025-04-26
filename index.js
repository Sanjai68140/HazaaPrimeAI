import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { scheduleMotivation, scheduleMorningMotivation, watchPaidPosts, watchFreePosts } from './scheduler.js';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Welcome message for safety
bot.start((ctx) => ctx.reply('HazaaPrimeAI Activated!'));

// Listen to new posts
bot.on('channel_post', async (ctx) => {
    const post = ctx.update.channel_post;
    const text = post.text || '';
    const chatId = post.chat.id;

    console.log('New post detected:', text);

    if (text.includes('Rpy')) {
        // Detected paid post
        await ctx.telegram.sendMessage(chatId, "Team Available Now! Unlock and Win Big! 🔥");
        watchPaidPosts(bot, chatId, post.message_id);
    } 
    else if (text.includes('Ready') || text.includes('Open')) {
        // Detected free team
        await ctx.telegram.sendMessage(chatId, "Free Team Posted! Let's Go! ⚡️");
        watchFreePosts(bot, chatId, post.message_id, text);
    }
});

// Daily Morning Motivation 4:30am
scheduleMorningMotivation(bot);

bot.launch();
console.log('HazaaPrimeAI_bot is running...');
