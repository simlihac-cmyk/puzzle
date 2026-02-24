export const dom = {
  board: document.getElementById("board"),
  boardWrap: document.getElementById("boardWrap"),
  status: document.getElementById("status"),
  modeInfo: document.getElementById("modeInfo"),
  timer: document.getElementById("timer"),
  leaderboard: document.getElementById("leaderboard"),
  userId: document.getElementById("userId"),
  difficulty: document.getElementById("difficulty"),
  loadSudoku: document.getElementById("loadSudoku"),
  loadPicross: document.getElementById("loadPicross"),
  submit: document.getElementById("submitBtn"),
  retry: document.getElementById("retryBtn"),
  check: document.getElementById("checkBtn"),
  clear: document.getElementById("clearBtn"),
  sudokuPad: document.getElementById("sudokuPad"),
  picrossTools: document.getElementById("picrossTools"),
  fillModeBtn: document.getElementById("fillModeBtn"),
  markModeBtn: document.getElementById("markModeBtn"),
};

export function setStatus(text) {
  dom.status.textContent = text;
}

export function setModeInfo(text) {
  dom.modeInfo.textContent = text;
}

export function setTimer(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  dom.timer.textContent = `${mm}:${ss}`;
}

export function setPicrossModeButtons(mode) {
  dom.fillModeBtn.classList.toggle("active", mode === "fill");
  dom.markModeBtn.classList.toggle("active", mode === "mark");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderLeaderboard(rows) {
  if (!rows || rows.length === 0) {
    dom.leaderboard.textContent = "아직 제출 기록이 없습니다.";
    return;
  }

  const html = [
    "<table><thead><tr><th>#</th><th>User</th><th>Score</th><th>Seconds</th></tr></thead><tbody>",
    ...rows.map(
      (r) => `<tr><td>${r.rank}</td><td>${escapeHtml(r.userId)}</td><td>${r.score}</td><td>${r.seconds}</td></tr>`
    ),
    "</tbody></table>",
  ].join("");

  dom.leaderboard.innerHTML = html;
}
