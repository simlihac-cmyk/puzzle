const { URL } = require("url");
const { MODES } = require("./config");
const { sendJson, sendNoContent, parseBody } = require("./http");
const { readStore, writeStore, pickBestSubmission, leaderboard } = require("./store");
const {
  todayUTC,
  getDailyPuzzle,
  validateSudokuSubmission,
  validatePicrossSubmission,
  sanitizeDailyResponse,
} = require("./puzzles");
const { scoreSubmission } = require("./scoring");
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

async function handleRequest(req, res) {
  const origin = req.headers.origin;

  if (req.method === "OPTIONS") {
    sendNoContent(res, origin);
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const rawPath = parsedUrl.pathname;
  const pathname = rawPath.startsWith("/api/") ? rawPath.slice(4) : rawPath;

  if (pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, service: "puzzle-api", now: new Date().toISOString() }, origin);
    return;
  }

  if (pathname === "/daily" && req.method === "GET") {
    const mode = String(parsedUrl.searchParams.get("mode") || "").toLowerCase();
    const dateKey = parsedUrl.searchParams.get("date") || todayUTC();
    const userId = String(parsedUrl.searchParams.get("userId") || "guest").trim() || "guest";
    const difficulty = String(parsedUrl.searchParams.get("difficulty") || "medium").toLowerCase();

    if (!MODES.has(mode)) {
      sendJson(res, 400, { error: "invalid mode", supportedModes: [...MODES] }, origin);
      return;
    }
    if (!DIFFICULTIES.has(difficulty)) {
      sendJson(res, 400, { error: "invalid difficulty", supportedDifficulties: [...DIFFICULTIES] }, origin);
      return;
    }

    const daily = getDailyPuzzle(mode, dateKey, difficulty);
    const store = readStore();

    sendJson(
      res,
      200,
      {
        daily: sanitizeDailyResponse(daily),
        myBest: pickBestSubmission(store, mode, `${dateKey}:${difficulty}`, userId),
        leaderboard: leaderboard(store, mode, `${dateKey}:${difficulty}`),
      },
      origin
    );
    return;
  }

  if (pathname === "/submit" && req.method === "POST") {
    let body;

    try {
      body = await parseBody(req);
    } catch (err) {
      sendJson(res, 400, { error: err.message }, origin);
      return;
    }

    const mode = String(body.mode || "").toLowerCase();
    const userId = String(body.userId || "guest").trim() || "guest";
    const dateKey = String(body.date || todayUTC());
    const difficulty = String(body.difficulty || "medium").toLowerCase();
    const seconds = Number(body.seconds || 0);

    if (!MODES.has(mode)) {
      sendJson(res, 400, { error: "invalid mode", supportedModes: [...MODES] }, origin);
      return;
    }
    if (!DIFFICULTIES.has(difficulty)) {
      sendJson(res, 400, { error: "invalid difficulty", supportedDifficulties: [...DIFFICULTIES] }, origin);
      return;
    }

    const daily = getDailyPuzzle(mode, dateKey, difficulty);
    const verdict = mode === "sudoku"
      ? validateSudokuSubmission(body.answer, daily)
      : validatePicrossSubmission(body.answer, daily);

    const submission = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      mode,
      date: `${dateKey}:${difficulty}`,
      dateKey,
      difficulty,
      userId,
      correct: verdict.ok,
      reason: verdict.ok ? null : verdict.reason,
      seconds: Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0,
      score: scoreSubmission(seconds, verdict.ok),
      submittedAt: new Date().toISOString(),
    };

    const store = readStore();
    store.users[userId] = { userId, updatedAt: submission.submittedAt };
    store.submissions.push(submission);
    writeStore(store);

    sendJson(
      res,
      200,
      {
        result: submission,
        leaderboard: leaderboard(store, mode, `${dateKey}:${difficulty}`),
      },
      origin
    );
    return;
  }

  sendJson(res, 404, { error: "Not Found" }, origin);
}

module.exports = {
  handleRequest,
};
