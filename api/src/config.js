const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const MODES = new Set(["sudoku", "picross"]);

const ALLOWED_ORIGINS = new Set([
  "https://puzzle.monosaccharide180.com",
  "https://puzzle2.monosaccharide180.com",
  "https://puzzle.localhost",
  "http://localhost:5173",
  "http://localhost:3000",
]);

module.exports = {
  PORT,
  STORE_PATH,
  MODES,
  ALLOWED_ORIGINS,
};
