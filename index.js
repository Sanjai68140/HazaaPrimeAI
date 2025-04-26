import { Telegraf } from 'telegraf';
import { startSchedulers } from './scheduler.js';
import dotenv from 'dotenv';

dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

startSchedulers(bot);

bot.launch();
console.log('Hazaa Prime AI Bot Started Successfully!');
