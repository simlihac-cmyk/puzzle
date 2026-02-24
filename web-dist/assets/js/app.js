import * as api from "./api.js?v=20260224-11";
import { state, setCurrentDaily } from "./state.js?v=20260224-11";
import { dom, setStatus, setTimer, renderLeaderboard } from "./ui.js?v=20260224-11";
import { renderSudokuBoard, collectSudokuAnswer } from "./puzzles/sudoku.js?v=20260224-11";
import { renderPicrossBoard, collectPicrossAnswer } from "./puzzles/picross.js?v=20260224-11";

let timerHandle = null;

function currentUserId() {
  return (dom.userId.value || "guest").trim() || "guest";
}

function startTimer() {
  if (timerHandle) clearInterval(timerHandle);
  setTimer(0);
  timerHandle = setInterval(() => {
    const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    setTimer(seconds);
  }, 1000);
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

function currentDifficulty() {
  const value = dom.difficulty?.value || "medium";
  return ["easy", "medium", "hard"].includes(value) ? value : "medium";
}

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle);
    return;
  }

  renderPicrossBoard(dom.board, daily.puzzle);
}

async function loadMode(mode) {
  setStatus("Loading puzzle...");
  const difficulty = currentDifficulty();

  try {
    const data = await api.fetchDaily({ mode, difficulty, userId: currentUserId() });
    setCurrentDaily(data.daily, mode, difficulty);
    renderBoardForMode(data.daily);
    renderLeaderboard(data.leaderboard);
    startTimer();
    rememberMode(mode);
    rememberDifficulty(difficulty);
    if (mode === "picross") {
      setStatus(`Loaded: ${data.daily.mode} ${difficulty} (${data.daily.date}) - right click for X mark`);
    } else {
      setStatus(`Loaded: ${data.daily.mode} ${difficulty} (${data.daily.date})`);
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

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
dom.retry.addEventListener("click", () => {
  if (state.currentMode) {
    loadMode(state.currentMode);
  } else {
    setStatus("Choose a mode first.");
  }
});

async function bootstrap() {
  try {
    if (typeof api.resolveApiBase === "function") {
      const base = await api.resolveApiBase();
      setStatus(`API connected: ${base}`);
    } else {
      setStatus("API module loaded");
    }

    const savedDifficulty = lastDifficulty();
    if (savedDifficulty && dom.difficulty) {
      dom.difficulty.value = savedDifficulty;
    }

    const mode = lastMode();
    if (mode === "sudoku" || mode === "picross") {
      await loadMode(mode);
    }
  } catch (err) {
    setStatus(`API connect failed: ${err.message}`);
  }
}

bootstrap();
