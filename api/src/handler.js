const { URL } = require("url");
const crypto = require("crypto");
const {
  MODES,
  PLAY_TOKEN_SECRET,
  MAX_USER_ID_LEN,
  MAX_CLIENT_ID_LEN,
} = require("./config");
const { sendJson, sendNoContent, parseBody } = require("./http");
const {
  readStore,
  mutateStore,
  pickBestSubmission,
  leaderboard,
} = require("./store");
const {
  todayUTC,
  getDailyPuzzle,
  validateSudokuSubmission,
  validatePicrossSubmission,
  sanitizeDailyResponse,
} = require("./puzzles");
const { scoreSubmission } = require("./scoring");
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const PLAY_TOKEN_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const SUBMIT_WINDOW_MS = 1000 * 60;
const SUBMIT_LIMIT_PER_WINDOW = 40;
const USER_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const submitWindowByActor = new Map();

function base64UrlEncode(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}

function base64UrlDecode(text) {
  return Buffer.from(text, "base64url").toString("utf8");
}

function signText(text) {
  return crypto
    .createHmac("sha256", PLAY_TOKEN_SECRET)
    .update(text)
    .digest("base64url");
}

function issuePlayToken(payload) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signText(encoded);
  return `${encoded}.${signature}`;
}

function verifyPlayToken(token) {
  if (!token || typeof token !== "string") return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signText(encoded);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encoded));
  } catch {
    return null;
  }
}

function parseUserId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "guest";
  if (value.length > MAX_USER_ID_LEN) return null;
  if (!USER_ID_PATTERN.test(value)) return null;
  return value;
}

function parseClientId(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.length < 12 || value.length > MAX_CLIENT_ID_LEN) return null;
  if (!CLIENT_ID_PATTERN.test(value)) return null;
  return value;
}

function actorKey(req, userId, clientId) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwardedFor || req.socket?.remoteAddress || "unknown-ip";
  return `${ip}:${userId}:${clientId}`;
}

function consumeSubmitBudget(req, userId, clientId) {
  const now = Date.now();
  const key = actorKey(req, userId, clientId);
  const bucket = submitWindowByActor.get(key) || [];
  const recent = bucket.filter((ts) => now - ts <= SUBMIT_WINDOW_MS);
  recent.push(now);
  submitWindowByActor.set(key, recent);
  return recent.length <= SUBMIT_LIMIT_PER_WINDOW;
}

function tokenPayloadMatches(playTokenPayload, expected) {
  if (!playTokenPayload || typeof playTokenPayload !== "object") return false;
  return (
    playTokenPayload.mode === expected.mode &&
    playTokenPayload.dateKey === expected.dateKey &&
    playTokenPayload.difficulty === expected.difficulty &&
    playTokenPayload.userId === expected.userId &&
    playTokenPayload.clientId === expected.clientId
  );
}

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
    const userId = parseUserId(parsedUrl.searchParams.get("userId"));
    const clientId = parseClientId(parsedUrl.searchParams.get("clientId"));
    const difficulty = String(parsedUrl.searchParams.get("difficulty") || "medium").toLowerCase();

    if (!MODES.has(mode)) {
      sendJson(res, 400, { error: "invalid mode", supportedModes: [...MODES] }, origin);
      return;
    }
    if (!DIFFICULTIES.has(difficulty)) {
      sendJson(res, 400, { error: "invalid difficulty", supportedDifficulties: [...DIFFICULTIES] }, origin);
      return;
    }
    if (!userId) {
      sendJson(res, 400, { error: "invalid userId (allowed: letters, numbers, ._- up to 24 chars)" }, origin);
      return;
    }
    if (!clientId) {
      sendJson(res, 400, { error: "invalid clientId" }, origin);
      return;
    }

    const daily = getDailyPuzzle(mode, dateKey, difficulty);
    const store = await readStore();

    const owner = store.users[userId];
    const userLocked = userId !== "guest" && owner && owner.clientId && owner.clientId !== clientId;

    sendJson(
      res,
      200,
      {
        daily: sanitizeDailyResponse(daily),
        myBest: userLocked
          ? null
          : pickBestSubmission(store, mode, `${dateKey}:${difficulty}`, userId, clientId),
        leaderboard: leaderboard(store, mode, `${dateKey}:${difficulty}`),
        playToken: issuePlayToken({
          mode,
          dateKey,
          difficulty,
          userId,
          clientId,
          issuedAt: Date.now(),
        }),
        userLocked,
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
    const userId = parseUserId(body.userId);
    const clientId = parseClientId(body.clientId);
    const dateKey = String(body.date || todayUTC());
    const difficulty = String(body.difficulty || "medium").toLowerCase();
    const playToken = String(body.playToken || "");

    if (!MODES.has(mode)) {
      sendJson(res, 400, { error: "invalid mode", supportedModes: [...MODES] }, origin);
      return;
    }
    if (!DIFFICULTIES.has(difficulty)) {
      sendJson(res, 400, { error: "invalid difficulty", supportedDifficulties: [...DIFFICULTIES] }, origin);
      return;
    }
    if (!userId) {
      sendJson(res, 400, { error: "invalid userId (allowed: letters, numbers, ._- up to 24 chars)" }, origin);
      return;
    }
    if (!clientId) {
      sendJson(res, 400, { error: "invalid clientId" }, origin);
      return;
    }
    if (!consumeSubmitBudget(req, userId, clientId)) {
      sendJson(res, 429, { error: "too many submissions, slow down" }, origin);
      return;
    }

    const tokenPayload = verifyPlayToken(playToken);
    if (!tokenPayload) {
      sendJson(res, 400, { error: "invalid playToken" }, origin);
      return;
    }

    if (!tokenPayloadMatches(tokenPayload, { mode, dateKey, difficulty, userId, clientId })) {
      sendJson(res, 400, { error: "playToken does not match request fields" }, origin);
      return;
    }

    const elapsedMs = Date.now() - Number(tokenPayload.issuedAt || 0);
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > PLAY_TOKEN_TTL_MS) {
      sendJson(res, 400, { error: "playToken expired; reload puzzle and retry" }, origin);
      return;
    }
    const seconds = Math.max(1, Math.floor(elapsedMs / 1000));

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
      clientId,
      correct: verdict.ok,
      reason: verdict.ok ? null : verdict.reason,
      seconds,
      score: scoreSubmission(seconds, verdict.ok),
      submittedAt: new Date().toISOString(),
    };

    let boardRows = [];
    try {
      await mutateStore((store) => {
        const existing = store.users[userId];
        if (userId !== "guest" && existing && existing.clientId && existing.clientId !== clientId) {
          const err = new Error("This userId is already claimed on another device.");
          err.statusCode = 403;
          throw err;
        }

        if (userId !== "guest") {
          store.users[userId] = {
            userId,
            clientId,
            createdAt: existing?.createdAt || submission.submittedAt,
            updatedAt: submission.submittedAt,
          };
        }

        store.submissions.push(submission);
        boardRows = leaderboard(store, mode, `${dateKey}:${difficulty}`);
      });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message || "failed to save submission" }, origin);
      return;
    }

    sendJson(
      res,
      200,
      {
        result: submission,
        leaderboard: boardRows,
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
