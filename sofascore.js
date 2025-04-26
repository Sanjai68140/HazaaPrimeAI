import axios from 'axios';

const BASE_URL = process.env.SOFASCORE_BASE_URL;

export async function getLiveFootballMatches() {
  try {
    const response = await axios.get(`${BASE_URL}sport/football/events/live`);
    return response.data.events || [];
  } catch (error) {
    console.error('Error fetching live matches:', error.message);
    return [];
  }
}

export async function getMatchLineup(eventId) {
  try {
    const response = await axios.get(`${BASE_URL}event/${eventId}/lineups`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lineups:', error.message);
    return null;
  }
}
