const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const MODES = new Set(["sudoku", "picross"]);
const PLAY_TOKEN_SECRET = process.env.PLAY_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const MAX_USER_ID_LEN = 24;
const MAX_CLIENT_ID_LEN = 64;
const SUBMISSION_LIMIT = Number(process.env.SUBMISSION_LIMIT || 20000);

const ALLOWED_ORIGINS = new Set([
  "https://puzzle.monosaccharide180.com",
  "https://puzzle2.monosaccharide180.com",
  "https://puzzle.localhost",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
]);

module.exports = {
  PORT,
  STORE_PATH,
  MODES,
  PLAY_TOKEN_SECRET,
  MAX_USER_ID_LEN,
  MAX_CLIENT_ID_LEN,
  SUBMISSION_LIMIT,
  ALLOWED_ORIGINS,
};
