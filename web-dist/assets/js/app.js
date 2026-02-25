import * as api from "./api.js?v=20260225-07";
import { state, setCurrentDaily } from "./state.js?v=20260225-07";
import { dom, setStatus, setModeInfo, setTimer, setPicrossModeButtons, renderLeaderboard } from "./ui.js?v=20260225-07";
import {
  renderSudokuBoard,
  collectSudokuAnswer,
  clearSudokuInputs,
  hasMultipleSudokuNotes,
  getSudokuInputStats,
} from "./puzzles/sudoku.js?v=20260225-07";
import {
  renderPicrossBoard,
  collectPicrossAnswer,
  setPicrossInputMode,
  clearPicrossBoard,
} from "./puzzles/picross.js?v=20260225-07";

let timerHandle = null;
let picrossEndState = "";
let latestLoadToken = 0;

function currentUserId() {
  const value = (dom.userId.value || "").trim();
  if (!value) return "guest";
  if (!/^[A-Za-z0-9._-]{1,24}$/.test(value)) {
    dom.userId.value = "guest";
    return "guest";
  }
  return value;
}

function currentDifficulty() {
  const value = dom.difficulty?.value || "medium";
  return ["easy", "medium", "hard"].includes(value) ? value : "medium";
}

function rememberMode(mode) {
  localStorage.setItem("puzzle:lastMode", mode);
}

function lastMode() {
  return localStorage.getItem("puzzle:lastMode");
}

function rememberDifficulty(level) {
  localStorage.setItem("puzzle:lastDifficulty", level);
}

function lastDifficulty() {
  return localStorage.getItem("puzzle:lastDifficulty");
}

function createClientId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `cid-${Date.now()}-${Math.random().toString(16).slice(2, 14)}`;
}

function loadOrCreateClientId() {
  const key = "puzzle:clientId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const generated = createClientId();
  localStorage.setItem(key, generated);
  return generated;
}

function startTimer() {
  if (timerHandle) clearInterval(timerHandle);
  setTimer(0);
  timerHandle = setInterval(() => {
    const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    setTimer(seconds);
  }, 1000);
}

function setModeUI(mode) {
  const isSudoku = mode === "sudoku";
  dom.picrossTools.classList.toggle("hidden", isSudoku);
  dom.sudokuPopup.classList.add("hidden");
  if (!isSudoku) setPicrossModeButtons(state.picrossInputMode);
}

function setBoardInfo(text) {
  setModeInfo(text || "");
}

function setSubmitEnabled(enabled) {
  dom.submit.disabled = !enabled;
}

function picrossTargetFromPuzzle(puzzle) {
  if (!puzzle?.rowClues) return 0;
  return puzzle.rowClues.flat().reduce((sum, n) => sum + Number(n || 0), 0);
}

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";
  dom.sudokuPopup.innerHTML = "";
  dom.sudokuPopup.classList.add("hidden");

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle, {
      onBoardChanged: ({ multi, empty, conflicts }) => {
        if (multi > 0) {
          setBoardInfo(`Memo cells: ${multi} (cannot submit)`);
          return;
        }
        if (conflicts > 0) {
          setBoardInfo(`Conflicts: ${conflicts}`);
          return;
        }
        if (empty > 0) {
          setBoardInfo(`Empty cells: ${empty}`);
          return;
        }
        setBoardInfo("Ready to submit");
      },
    });
    return;
  }

  const hint = daily.puzzle.title || "-";
  picrossEndState = "";

  renderPicrossBoard(dom.board, daily.puzzle, {
    inputMode: state.picrossInputMode,
    onBoardChanged: ({ filled, target, solved }) => {
      setBoardInfo(`Hint: ${hint} | ${filled}/${target}`);

      if (solved && picrossEndState !== "solved") {
        picrossEndState = "solved";
        setStatus("Picross clear");
      }
    },
  });
}

async function loadMode(mode) {
  const loadToken = ++latestLoadToken;
  setStatus("Loading...");
  const difficulty = currentDifficulty();

  try {
    const data = await api.fetchDaily({
      mode,
      difficulty,
      userId: currentUserId(),
      clientId: state.clientId,
    });
    if (loadToken !== latestLoadToken) return;

    setCurrentDaily(data.daily, mode, difficulty, data.playToken);
    setModeUI(mode);
    renderBoardForMode(data.daily);
    renderLeaderboard(data.leaderboard);
    startTimer();
    rememberMode(mode);
    rememberDifficulty(difficulty);

    if (data.userLocked) {
      setSubmitEnabled(false);
      setStatus("This userId is already locked on another device. Change userId to submit.");
      return;
    }

    setSubmitEnabled(true);
    setStatus(mode === "picross" ? "Picross ready" : "Sudoku ready");
  } catch (err) {
    if (loadToken !== latestLoadToken) return;
    setStatus(`Load failed: ${err.message}`);
    setSubmitEnabled(false);
  }
}

function currentAnswer() {
  if (!state.current) return null;
  if (state.current.mode === "sudoku") return collectSudokuAnswer(dom.board);
  return collectPicrossAnswer(dom.board, state.current.puzzle.size);
}

async function submitCurrent() {
  if (!state.current) {
    setStatus("Load a puzzle first");
    return;
  }
  if (!state.playToken) {
    setStatus("Session expired. Reload puzzle first");
    return;
  }

  if (state.current.mode === "sudoku" && hasMultipleSudokuNotes(dom.board)) {
    setStatus("Submit blocked: remove memo cells");
    return;
  }

  try {
    const data = await api.submitAnswer({
      mode: state.current.mode,
      userId: currentUserId(),
      clientId: state.clientId,
      date: state.current.date,
      difficulty: state.currentDifficulty || currentDifficulty(),
      playToken: state.playToken,
      answer: currentAnswer(),
    });

    if (data.result.correct) setStatus(`Correct: ${data.result.score} pts, ${data.result.seconds}s`);
    else setStatus(`Wrong: ${data.result.reason}`);

    renderLeaderboard(data.leaderboard);
  } catch (err) {
    setStatus(`Submit failed: ${err.message}`);
  }
}

function clearCurrentBoard() {
  if (!state.currentMode) {
    setStatus("Load a puzzle first");
    return;
  }

  if (state.currentMode === "sudoku") {
    clearSudokuInputs(dom.board);
    setStatus("Sudoku cleared");
  } else {
    clearPicrossBoard(dom.board);
    setStatus("Picross cleared");
  }
}

function checkCurrentBoard() {
  if (!state.currentMode) {
    setStatus("Load a puzzle first");
    return;
  }

  if (state.currentMode === "sudoku") {
    const s = getSudokuInputStats(dom.board);
    setStatus(`Check: memo ${s.multi}, empty ${s.empty}, conflicts ${s.conflicts}`);
  } else {
    const answer = currentAnswer();
    const filled = answer.flat().filter((v) => Number(v) === 1).length;
    const target = picrossTargetFromPuzzle(state.current.puzzle);
    setStatus(`Check: filled ${filled}, target ${target}`);
  }
}

function setPicrossMode(mode) {
  state.picrossInputMode = mode;
  setPicrossInputMode(dom.board, mode);
  setPicrossModeButtons(mode);
  setStatus(mode === "fill" ? "Picross fill mode" : "Picross mark mode");
}

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
dom.retry.addEventListener("click", () => {
  if (state.currentMode) loadMode(state.currentMode);
  else setStatus("Choose a mode first");
});
dom.check.addEventListener("click", checkCurrentBoard);
dom.clear.addEventListener("click", clearCurrentBoard);
dom.fillModeBtn.addEventListener("click", () => setPicrossMode("fill"));
dom.markModeBtn.addEventListener("click", () => setPicrossMode("mark"));

dom.difficulty?.addEventListener("change", () => {
  if (state.currentMode) loadMode(state.currentMode);
});

async function bootstrap() {
  try {
    state.clientId = loadOrCreateClientId();
    setModeUI("sudoku");
    setSubmitEnabled(false);

    if (typeof api.resolveApiBase === "function") {
      await api.resolveApiBase();
    }

    const savedDifficulty = lastDifficulty();
    if (savedDifficulty && dom.difficulty) dom.difficulty.value = savedDifficulty;

    const mode = lastMode();
    if (mode === "sudoku" || mode === "picross") {
      await loadMode(mode);
    } else {
      setStatus("Choose a mode to start");
    }
  } catch (err) {
    setStatus(`Connection failed: ${err.message}`);
    setSubmitEnabled(false);
  }
}

bootstrap();
