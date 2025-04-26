import axios from 'axios';

export const getMatchStats = async (matchName) => {
    try {
        const response = await axios.get(`https://api.sofascore.com/api/v1/event/${matchName}/statistics`);
        const data = response.data;

        return {
            possession: data.possession || 'N/A',
            shots: data.shotsOnTarget || 'N/A',
            attacks: data.totalAttacks || 'N/A',
            defense: data.totalTackles || 'N/A'
        };
    } catch (error) {
        console.error('Error fetching match stats:', error);
        return null;
    }
};

export const getLineupsFromSofascore = async (matchName) => {
    try {
        const response = await axios.get(`https://api.sofascore.com/api/v1/event/${matchName}/lineups`);
        const data = response.data;

        if (data.home && data.away) {
            return `
${data.home.name} Lineup: ${data.home.lineup.map(p => p.player.name).join(', ')}
${data.away.name} Lineup: ${data.away.lineup.map(p => p.player.name).join(', ')}
            `;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching lineups:', error);
        return null;
    }
};
