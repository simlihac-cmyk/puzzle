import * as api from "./api.js?v=20260224-12";
import { state, setCurrentDaily } from "./state.js?v=20260224-12";
import { dom, setStatus, setModeInfo, setTimer, setPicrossModeButtons, renderLeaderboard } from "./ui.js?v=20260224-12";
import {
  renderSudokuBoard,
  collectSudokuAnswer,
  setSelectedSudokuValue,
  clearSudokuInputs,
} from "./puzzles/sudoku.js?v=20260224-12";
import {
  renderPicrossBoard,
  collectPicrossAnswer,
  setPicrossInputMode,
  clearPicrossBoard,
} from "./puzzles/picross.js?v=20260224-12";

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
  dom.sudokuPad.classList.toggle("hidden", !isSudoku);
  dom.picrossTools.classList.toggle("hidden", isSudoku);
  if (!isSudoku) {
    setPicrossModeButtons(state.picrossInputMode);
  }
}

function ensureSudokuPad() {
  if (dom.sudokuPad.children.length > 0) return;

  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, "erase"];
  for (const value of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";

    if (value === "erase") {
      button.textContent = "Erase";
      button.addEventListener("click", () => setSelectedSudokuValue(dom.board, ""));
    } else {
      button.textContent = String(value);
      button.addEventListener("click", () => setSelectedSudokuValue(dom.board, value));
    }

    dom.sudokuPad.appendChild(button);
  }
}

function setBoardInfo(text) {
  setModeInfo(text);
}

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle, {
      onBoardChanged: ({ filled, totalEditable, conflicts }) => {
        setBoardInfo(`Sudoku progress: ${filled}/${totalEditable} | conflicts: ${conflicts}`);
      },
    });
    return;
  }

  renderPicrossBoard(dom.board, daily.puzzle, {
    inputMode: state.picrossInputMode,
    onBoardChanged: ({ filled, total }) => {
      setBoardInfo(`Picross progress: ${filled}/${total} filled`);
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
      setStatus(`Loaded: ${mode} ${difficulty} (${data.daily.date}) - Fill/Mark mode available`);
    } else {
      setStatus(`Loaded: ${mode} ${difficulty} (${data.daily.date}) - use keypad for fast input`);
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

  const answer = currentAnswer();
  if (state.currentMode === "sudoku") {
    const filled = answer.flat().filter((v) => Number(v) > 0).length;
    setStatus(`Sudoku check: ${filled}/81 cells entered.`);
  } else {
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
    ensureSudokuPad();
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

