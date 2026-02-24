const fs = require("fs");
const path = require("path");
const { STORE_PATH } = require("./config");

function readStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return { users: {}, submissions: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch (err) {
    console.error("Failed to read store.json, recreating.", err);
    return { users: {}, submissions: [] };
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function pickBestSubmission(store, mode, dateKey, userId) {
  return store.submissions
    .filter((s) => s.mode === mode && s.date === dateKey && s.userId === userId && s.correct)
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds)[0] || null;
}

function leaderboard(store, mode, dateKey) {
  const bestByUser = new Map();

  store.submissions
    .filter((s) => s.mode === mode && s.date === dateKey && s.correct)
    .forEach((s) => {
      const prev = bestByUser.get(s.userId);
      if (!prev || s.score > prev.score || (s.score === prev.score && s.seconds < prev.seconds)) {
        bestByUser.set(s.userId, s);
      }
    });

  return [...bestByUser.values()]
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds)
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      userId: s.userId,
      score: s.score,
      seconds: s.seconds,
      submittedAt: s.submittedAt,
    }));
}

module.exports = {
  readStore,
  writeStore,
  pickBestSubmission,
  leaderboard,
};
