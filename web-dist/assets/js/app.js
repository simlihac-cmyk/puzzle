import * as api from "./api.js?v=20260225-03";
import { state, setCurrentDaily } from "./state.js?v=20260225-03";
import { dom, setStatus, setModeInfo, setTimer, setPicrossModeButtons, renderLeaderboard } from "./ui.js?v=20260225-03";
import {
  renderSudokuBoard,
  collectSudokuAnswer,
  clearSudokuInputs,
  hasMultipleSudokuNotes,
  getSudokuInputStats,
} from "./puzzles/sudoku.js?v=20260225-03";
import {
  renderPicrossBoard,
  collectPicrossAnswer,
  setPicrossInputMode,
  clearPicrossBoard,
} from "./puzzles/picross.js?v=20260225-03";

let timerHandle = null;

function currentUserId() {
  return (dom.userId.value || "guest").trim() || "guest";
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
  dom.sudokuPopup.classList.toggle("hidden", true);
  if (!isSudoku) {
    setPicrossModeButtons(state.picrossInputMode);
  }
}

function setBoardInfo(text) {
  setModeInfo(text);
}

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";
  dom.sudokuPopup.innerHTML = "";
  dom.sudokuPopup.classList.add("hidden");

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle, {
      onBoardChanged: ({ singles, multi, empty, conflicts, totalEditable }) => {
        setBoardInfo(`Sudoku progress: single=${singles}, memo=${multi}, empty=${empty} / ${totalEditable} | conflicts: ${conflicts}`);
      },
    });
    return;
  }

  const hint = daily.puzzle.title ? `Hint: ${daily.puzzle.title}` : "";
  renderPicrossBoard(dom.board, daily.puzzle, {
    inputMode: state.picrossInputMode,
    onBoardChanged: ({ filled, total }) => {
      setBoardInfo(`${hint} | Picross progress: ${filled}/${total} filled`);
    },
  });
}

async function loadMode(mode) {
  setStatus("Loading puzzle...");
  const difficulty = currentDifficulty();

  try {
    const data = await api.fetchDaily({ mode, difficulty, userId: currentUserId() });
    setCurrentDaily(data.daily, mode, difficulty);
    setModeUI(mode);
    renderBoardForMode(data.daily);
    renderLeaderboard(data.leaderboard);
    startTimer();
    rememberMode(mode);
    rememberDifficulty(difficulty);

    if (mode === "picross") {
      const hint = data.daily.puzzle.title ? ` | hint: ${data.daily.puzzle.title}` : "";
      setStatus(`Loaded: ${mode} ${difficulty} (${data.daily.date})${hint}`);
    } else {
      setStatus(`Loaded: ${mode} ${difficulty} (${data.daily.date}) - tap a cell, choose 1~9 notes, tap outside to close`);
    }
  } catch (err) {
    setStatus(`Load failed: ${err.message}`);
  }
}

function currentAnswer() {
  if (!state.current) return null;
  if (state.current.mode === "sudoku") {
    return collectSudokuAnswer(dom.board);
  }
  return collectPicrossAnswer(dom.board, state.current.puzzle.size);
}

async function submitCurrent() {
  if (!state.current) {
    setStatus("Load a puzzle first.");
    return;
  }

  if (state.current.mode === "sudoku" && hasMultipleSudokuNotes(dom.board)) {
    setStatus("Submit blocked: at least one Sudoku cell still has multiple notes.");
    return;
  }

  try {
    const seconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    const data = await api.submitAnswer({
      mode: state.current.mode,
      userId: currentUserId(),
      date: state.current.date,
      difficulty: state.currentDifficulty || currentDifficulty(),
      seconds,
      answer: currentAnswer(),
    });

    if (data.result.correct) {
      setStatus(`Correct! score=${data.result.score}, ${data.result.seconds}s`);
    } else {
      setStatus(`Wrong: ${data.result.reason}`);
    }

    renderLeaderboard(data.leaderboard);
  } catch (err) {
    setStatus(`Submit failed: ${err.message}`);
  }
}

function clearCurrentBoard() {
  if (!state.currentMode) {
    setStatus("Load a puzzle first.");
    return;
  }

  if (state.currentMode === "sudoku") {
    clearSudokuInputs(dom.board);
    setStatus("Sudoku board cleared.");
  } else {
    clearPicrossBoard(dom.board);
    setStatus("Picross board cleared.");
  }
}

function checkCurrentBoard() {
  if (!state.currentMode) {
    setStatus("Load a puzzle first.");
    return;
  }

  if (state.currentMode === "sudoku") {
    const s = getSudokuInputStats(dom.board);
    setStatus(`Sudoku check: single=${s.singles}, memo=${s.multi}, empty=${s.empty}, conflicts=${s.conflicts}`);
  } else {
    const answer = currentAnswer();
    const filled = answer.flat().filter((v) => Number(v) === 1).length;
    const total = state.current.puzzle.size * state.current.puzzle.size;
    setStatus(`Picross check: ${filled}/${total} cells filled.`);
  }
}

function setPicrossMode(mode) {
  state.picrossInputMode = mode;
  setPicrossInputMode(dom.board, mode);
  setPicrossModeButtons(mode);
  setStatus(`Picross input mode: ${mode}`);
}

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
dom.retry.addEventListener("click", () => {
  if (state.currentMode) loadMode(state.currentMode);
  else setStatus("Choose a mode first.");
});
dom.check.addEventListener("click", checkCurrentBoard);
dom.clear.addEventListener("click", clearCurrentBoard);
dom.fillModeBtn.addEventListener("click", () => setPicrossMode("fill"));
dom.markModeBtn.addEventListener("click", () => setPicrossMode("mark"));

dom.difficulty?.addEventListener("change", () => {
  if (state.currentMode) {
    loadMode(state.currentMode);
  }
});

async function bootstrap() {
  try {
    setModeUI("sudoku");

    if (typeof api.resolveApiBase === "function") {
      const base = await api.resolveApiBase();
      setStatus(`API connected: ${base}`);
    } else {
      setStatus("API module loaded");
    }

    const savedDifficulty = lastDifficulty();
    if (savedDifficulty && dom.difficulty) dom.difficulty.value = savedDifficulty;

    const mode = lastMode();
    if (mode === "sudoku" || mode === "picross") {
      await loadMode(mode);
    }
  } catch (err) {
    setStatus(`API connect failed: ${err.message}`);
  }
}

bootstrap();
