export function getRandomMotivation() {
  const messages = [
    "⚡ Stay strong, champions! Your dream team awaits!",
    "⚽ Believe in your choices, your success story is building!",
    "✨ Hard work + Smart picks = Victory!",
    "🔥 Legends are not born, they are made. You are next!",
    "🏆 Every small move today builds your big win tomorrow!"
  ];
  const index = Math.floor(Math.random() * messages.length);
  return `🔔 Motivation Time 🔔\n\n${messages[index]}`;
}
