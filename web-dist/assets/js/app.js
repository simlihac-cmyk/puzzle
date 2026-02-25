import * as api from "./api.js?v=20260225-05";
import { state, setCurrentDaily } from "./state.js?v=20260225-05";
import { dom, setStatus, setModeInfo, setTimer, setPicrossModeButtons, renderLeaderboard } from "./ui.js?v=20260225-05";
import {
  renderSudokuBoard,
  collectSudokuAnswer,
  clearSudokuInputs,
  hasMultipleSudokuNotes,
  getSudokuInputStats,
} from "./puzzles/sudoku.js?v=20260225-05";
import {
  renderPicrossBoard,
  collectPicrossAnswer,
  setPicrossInputMode,
  clearPicrossBoard,
} from "./puzzles/picross.js?v=20260225-05";

let timerHandle = null;
let picrossEndState = "";

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
  dom.sudokuPopup.classList.add("hidden");
  if (!isSudoku) {
    setPicrossModeButtons(state.picrossInputMode);
  }
}

function setBoardInfo(text) {
  setModeInfo(text || "");
}

function renderBoardForMode(daily) {
  dom.board.innerHTML = "";
  dom.sudokuPopup.innerHTML = "";
  dom.sudokuPopup.classList.add("hidden");

  if (daily.mode === "sudoku") {
    renderSudokuBoard(dom.board, daily.puzzle, {
      onBoardChanged: ({ multi, empty, conflicts }) => {
        if (multi > 0) {
          setBoardInfo(`硫붾え 移?${multi}媛??⑥쓬 (?쒖텧 遺덇?)`);
          return;
        }
        if (conflicts > 0) {
          setBoardInfo(`以묐났 ?レ옄 ${conflicts}媛??섏젙 ?꾩슂`);
          return;
        }
        if (empty > 0) {
          setBoardInfo(`鍮?移?${empty}媛?);
          return;
        }
        setBoardInfo("?쒖텧 媛??);
      },
    });
    return;
  }

  const hint = daily.puzzle.title ? daily.puzzle.title : "-";
  picrossEndState = "";

  renderPicrossBoard(dom.board, daily.puzzle, {
    inputMode: state.picrossInputMode,
    onBoardChanged: ({ filled, target, lives, maxLives, gameOver, solved }) => {
      setBoardInfo(`?뚰듃: ${hint} | ?쇱씠??${lives}/${maxLives} | ${filled}/${target}`);

      if (solved && picrossEndState !== "solved") {
        picrossEndState = "solved";
        setStatus("?쇳겕濡쒖뒪 ?대━??");
      } else if (gameOver && lives <= 0 && picrossEndState !== "gameover") {
        picrossEndState = "gameover";
        setStatus("寃뚯엫 ?ㅻ쾭 (?쇱씠??0) - ?ㅼ떆 遺덈윭?ㅺ린濡??щ룄??);
      }
    },
  });
}

async function loadMode(mode) {
  setStatus("遺덈윭?ㅻ뒗 以?..");
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
    setStatus(mode === "picross" ? "?쇳겕濡쒖뒪 以鍮??꾨즺" : "?ㅻ룄荑?以鍮??꾨즺");
  } catch (err) {
    setStatus(`遺덈윭?ㅺ린 ?ㅽ뙣: ${err.message}`);
  }
}

function currentAnswer() {
  if (!state.current) return null;
  if (state.current.mode === "sudoku") return collectSudokuAnswer(dom.board);
  return collectPicrossAnswer(dom.board, state.current.puzzle.size);
}

async function submitCurrent() {
  if (!state.current) {
    setStatus("癒쇱? ?쇱쫹??遺덈윭?ㅼ꽭??");
    return;
  }

  if (state.current.mode === "sudoku" && hasMultipleSudokuNotes(dom.board)) {
    setStatus("?쒖텧 遺덇?: 硫붾え 移몄쓣 紐⑤몢 ?뺣━?섏꽭??");
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

    if (data.result.correct) setStatus(`?뺣떟! ?먯닔 ${data.result.score}, ${data.result.seconds}珥?);
    else setStatus(`?ㅻ떟: ${data.result.reason}`);

    renderLeaderboard(data.leaderboard);
  } catch (err) {
    setStatus(`?쒖텧 ?ㅽ뙣: ${err.message}`);
  }
}

function clearCurrentBoard() {
  if (!state.currentMode) {
    setStatus("癒쇱? ?쇱쫹??遺덈윭?ㅼ꽭??");
    return;
  }

  if (state.currentMode === "sudoku") {
    clearSudokuInputs(dom.board);
    setStatus("?ㅻ룄荑?珥덇린???꾨즺");
  } else {
    clearPicrossBoard(dom.board);
    renderBoardForMode(state.current);
    setStatus("?쇳겕濡쒖뒪 珥덇린???꾨즺");
  }
}

function checkCurrentBoard() {
  if (!state.currentMode) {
    setStatus("癒쇱? ?쇱쫹??遺덈윭?ㅼ꽭??");
    return;
  }

  if (state.currentMode === "sudoku") {
    const s = getSudokuInputStats(dom.board);
    setStatus(`?ㅻ룄荑??뺤씤: 硫붾え ${s.multi}, 鍮덉뭏 ${s.empty}, 異⑸룎 ${s.conflicts}`);
  } else {
    const answer = currentAnswer();
    const filled = answer.flat().filter((v) => Number(v) === 1).length;
    const total = state.current.puzzle.size * state.current.puzzle.size;
    setStatus(`?쇳겕濡쒖뒪 ?뺤씤: ${filled}/${total}`);
  }
}

function setPicrossMode(mode) {
  state.picrossInputMode = mode;
  setPicrossInputMode(dom.board, mode);
  setPicrossModeButtons(mode);
  setStatus(mode === "fill" ? "?쇳겕濡쒖뒪 梨꾩슦湲?紐⑤뱶" : "?쇳겕濡쒖뒪 X?쒖떆 紐⑤뱶");
}

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
dom.retry.addEventListener("click", () => {
  if (state.currentMode) loadMode(state.currentMode);
  else setStatus("紐⑤뱶瑜?癒쇱? ?좏깮?섏꽭??");
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
    setModeUI("sudoku");
    if (typeof api.resolveApiBase === "function") {
      await api.resolveApiBase();
    }

    const savedDifficulty = lastDifficulty();
    if (savedDifficulty && dom.difficulty) dom.difficulty.value = savedDifficulty;

    const mode = lastMode();
    if (mode === "sudoku" || mode === "picross") {
      await loadMode(mode);
    } else {
      setStatus("紐⑤뱶瑜??좏깮???쒖옉?섏꽭??");
    }
  } catch (err) {
    setStatus(`?곌껐 ?ㅽ뙣: ${err.message}`);
  }
}

bootstrap();
