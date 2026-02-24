import * as api from "./api.js?v=20260224-6";
import { state, setCurrentDaily } from "./state.js?v=20260224-6";
import { dom, setStatus, setTimer, renderLeaderboard } from "./ui.js?v=20260224-6";
import { renderSudokuBoard, collectSudokuAnswer } from "./puzzles/sudoku.js?v=20260224-6";
import { renderPicrossBoard, collectPicrossAnswer } from "./puzzles/picross.js?v=20260224-6";

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

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle);
    return;
  }

  renderPicrossBoard(dom.board, daily.puzzle);
}

async function loadMode(mode) {
  setStatus("?쇱쫹??遺덈윭?ㅻ뒗 以?..");

  try {
    const data = await api.fetchDaily({ mode, userId: currentUserId() });
    setCurrentDaily(data.daily, mode);
    renderBoardForMode(data.daily);
    renderLeaderboard(data.leaderboard);
    startTimer();
    rememberMode(mode);
    setStatus(`濡쒕뱶 ?꾨즺: ${data.daily.mode} (${data.daily.date})`);
  } catch (err) {
    setStatus(`遺덈윭?ㅺ린 ?ㅽ뙣: ${err.message}`);
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
    setStatus("癒쇱? ?쇱쫹??遺덈윭?ㅼ꽭??");
    return;
  }

  try {
    const seconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    const data = await api.submitAnswer({
      mode: state.current.mode,
      userId: currentUserId(),
      date: state.current.date,
      seconds,
      answer: currentAnswer(),
    });

    if (data.result.correct) {
      setStatus(`?뺣떟! score=${data.result.score}, ${data.result.seconds}珥?);
    } else {
      setStatus(`?ㅻ떟: ${data.result.reason}`);
    }

    renderLeaderboard(data.leaderboard);
  } catch (err) {
    setStatus(`?쒖텧 ?ㅽ뙣: ${err.message}`);
  }
}

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
dom.retry.addEventListener("click", () => {
  if (state.currentMode) {
    loadMode(state.currentMode);
  } else {
    setStatus("癒쇱? 紐⑤뱶瑜??좏깮?섏꽭??");
  }
});

async function bootstrap() {
  try {
    if (typeof api.resolveApiBase === "function") {
      const base = await api.resolveApiBase();
      setStatus(`API ?곌껐 ?깃났: ${base}`);
    } else {
      setStatus("API 紐⑤뱢 濡쒕뱶 ?꾨즺");
    }

    const mode = lastMode();
    if (mode === "sudoku" || mode === "picross") {
      await loadMode(mode);
    }
  } catch (err) {
    setStatus(`API ?곌껐 ?ㅽ뙣: ${err.message}`);
  }
}

bootstrap();
