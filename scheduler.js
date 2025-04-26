import { getMatchStats, getLineupsFromSofascore } from './sofascore.js';

// Function to motivate every 5 minutes
export const watchPaidPosts = (bot, chatId, messageId) => {
    const interval = setInterval(async () => {
        try {
            await bot.telegram.sendMessage(chatId, `
🧠 Stay Focused Champion!
✅ Unlock your winning team before deadline!
🔥 We are making history today!
            `);
        } catch (err) {
            console.error('Error sending motivation:', err);
        }
    }, 5 * 60 * 1000);

    // Stop after 35 minutes
    setTimeout(() => {
        clearInterval(interval);
    }, 35 * 60 * 1000);
};

// Function to post stats for open teams
export const watchFreePosts = async (bot, chatId, messageId, postText) => {
    try {
        const matchName = extractMatchName(postText);

        if (!matchName) return;

        const stats = await getMatchStats(matchName);
        if (stats) {
            await bot.telegram.sendMessage(chatId, `
📈 Match Insights for ${matchName} 📈
Possession: ${stats.possession}%
Shots: ${stats.shots}
Attack: ${stats.attacks}
Defense: ${stats.defense}

Lineup and Strategy incoming...
            `);

            // Start looking for lineups
            searchLineup(bot, chatId, matchName);
        }
    } catch (err) {
        console.error('Error posting stats:', err);
    }
};

// Function to search and post lineups before match
const searchLineup = async (bot, chatId, matchName) => {
    const interval = setInterval(async () => {
        try {
            const lineup = await getLineupsFromSofascore(matchName);
            if (lineup) {
                await bot.telegram.sendMessage(chatId, `
✅ Confirmed Lineups for ${matchName} ✅

${lineup}

Get ready to play smart!
                `);
                clearInterval(interval); // stop after posting
            }
        } catch (err) {
            console.error('Lineup search error:', err);
        }
    }, 60 * 1000); // check every 1 minute
};

// 4:30AM Morning Message
export const scheduleMorningMotivation = (bot) => {
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 4 && now.getMinutes() === 30) {
            const messages = [
                "☀️ Good Morning Champion! A New Day to Win Big!",
                "⚽ Let's crush today's matches with the best teams!",
                "🌟 Trust the Process. Trust HazaaPrime!"
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const chatId = '@haazaprime'; // Main channel or later you can dynamic if needed

            await bot.telegram.sendMessage(chatId, randomMessage);
        }
    }, 60 * 1000); // check every minute
};

const extractMatchName = (text) => {
    const matchRegex = /([A-Za-z]+ vs [A-Za-z]+)/;
    const match = text.match(matchRegex);
    return match ? match[1] : null;
};
