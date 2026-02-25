const fs = require("fs/promises");
const path = require("path");
const { STORE_PATH, SUBMISSION_LIMIT } = require("./config");

const EMPTY_STORE = { users: {}, submissions: [] };
let cachedStore = null;
let writeQueue = Promise.resolve();

function enqueueWrite(task) {
  writeQueue = writeQueue.catch(() => {}).then(task);
  return writeQueue;
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STORE };
  const users = raw.users && typeof raw.users === "object" ? raw.users : {};
  const submissions = Array.isArray(raw.submissions) ? raw.submissions : [];
  return { users, submissions };
}

async function persistStore(store) {
  const fileDir = path.dirname(STORE_PATH);
  const tempPath = `${STORE_PATH}.tmp`;

  await fs.mkdir(fileDir, { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, STORE_PATH);
}

async function readStore() {
  if (cachedStore) return cachedStore;

  try {
    const text = await fs.readFile(STORE_PATH, "utf8");
    cachedStore = normalizeStore(JSON.parse(text));
    return cachedStore;
  } catch (err) {
    if (err && err.code === "ENOENT") {
      cachedStore = { ...EMPTY_STORE };
      return cachedStore;
    }
    console.error("Failed to read store.json, recreating.", err);
    cachedStore = { ...EMPTY_STORE };
    return cachedStore;
  }
}

async function writeStore(store) {
  cachedStore = normalizeStore(store);
  enqueueWrite(() => persistStore(cachedStore)).catch((err) => {
    console.error("Failed to persist store.json", err);
    throw err;
  });
  return writeQueue;
}

async function mutateStore(mutator) {
  let result;
  enqueueWrite(async () => {
    const store = await readStore();
    result = await mutator(store);
    if (store.submissions.length > SUBMISSION_LIMIT) {
      store.submissions = store.submissions.slice(-SUBMISSION_LIMIT);
    }
    await persistStore(store);
  });

  await writeQueue;
  return result;
}

function pickBestSubmission(store, mode, dateKey, userId, clientId = null) {
  return store.submissions
    .filter((s) => {
      if (s.mode !== mode || s.date !== dateKey || s.userId !== userId || !s.correct) return false;
      if (!clientId) return true;
      return !s.clientId || s.clientId === clientId;
    })
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds)[0] || null;
}

function leaderboard(store, mode, dateKey) {
  const bestByKey = new Map();

  store.submissions
    .filter((s) => s.mode === mode && s.date === dateKey && s.correct)
    .forEach((s) => {
      const identityKey = s.clientId ? `${s.userId}:${s.clientId}` : s.userId;
      const prev = bestByKey.get(identityKey);
      if (!prev || s.score > prev.score || (s.score === prev.score && s.seconds < prev.seconds)) {
        bestByKey.set(identityKey, s);
      }
    });

  const uniqueByUserId = new Map();
  [...bestByKey.values()]
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds)
    .forEach((entry) => {
      if (!uniqueByUserId.has(entry.userId)) {
        uniqueByUserId.set(entry.userId, entry);
      }
    });

  return [...uniqueByUserId.values()]
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
  mutateStore,
  pickBestSubmission,
  leaderboard,
};
