import { fetchDaily, submitAnswer } from "./api.js";
import { state, setCurrentDaily } from "./state.js";
import { dom, setStatus, renderLeaderboard } from "./ui.js";
import { renderSudokuBoard, collectSudokuAnswer } from "./puzzles/sudoku.js";
import { renderPicrossBoard, collectPicrossAnswer } from "./puzzles/picross.js";

function currentUserId() {
  return (dom.userId.value || "guest").trim() || "guest";
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
  setStatus("퍼즐을 불러오는 중...");

  try {
    const data = await fetchDaily({ mode, userId: currentUserId() });
    setCurrentDaily(data.daily);
    renderBoardForMode(data.daily);
    renderLeaderboard(data.leaderboard);
    setStatus(`로드 완료: ${data.daily.mode} (${data.daily.date})`);
  } catch (err) {
    setStatus(`불러오기 실패: ${err.message}`);
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
    setStatus("먼저 퍼즐을 불러오세요.");
    return;
  }

  try {
    const seconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    const data = await submitAnswer({
      mode: state.current.mode,
      userId: currentUserId(),
      date: state.current.date,
      seconds,
      answer: currentAnswer(),
    });

    if (data.result.correct) {
      setStatus(`정답! score=${data.result.score}, ${data.result.seconds}초`);
    } else {
      setStatus(`오답: ${data.result.reason}`);
    }

    renderLeaderboard(data.leaderboard);
  } catch (err) {
    setStatus(`제출 실패: ${err.message}`);
  }
}

dom.loadSudoku.addEventListener("click", () => loadMode("sudoku"));
dom.loadPicross.addEventListener("click", () => loadMode("picross"));
dom.submit.addEventListener("click", submitCurrent);
