function setFill(cell, on) {
  cell.dataset.v = on ? "1" : "0";
  cell.classList.toggle("on", on);
  if (on) {
    cell.classList.remove("mark");
    cell.textContent = "■";
  } else {
    cell.textContent = cell.classList.contains("mark") ? "X" : "·";
  }
}

function setMark(cell, marked) {
  if (cell.dataset.v === "1") return;
  cell.classList.toggle("mark", marked);
  cell.textContent = marked ? "X" : "·";
}

function getCell(board, r, c) {
  return board.querySelector(`.picross-cell[data-r="${r}"][data-c="${c}"]`);
}

function getLives(board) {
  return Number(board.dataset.lives || board.dataset.maxLives || 5);
}

function setLives(board, value) {
  board.dataset.lives = String(Math.max(0, value));
}

function isGameOver(board) {
  return board.dataset.gameOver === "1";
}

function setGameOver(board, value) {
  board.dataset.gameOver = value ? "1" : "0";
}

function targetFillCount(solution) {
  return solution.flat().filter((v) => Number(v) === 1).length;
}

function progressState(board) {
  const cells = board.querySelectorAll(".picross-cell");
  const filled = [...cells].filter((c) => c.dataset.v === "1").length;
  const solution = board.__solution || [];
  const target = solution.length > 0 ? targetFillCount(solution) : cells.length;

  return {
    filled,
    total: cells.length,
    target,
    lives: getLives(board),
    maxLives: Number(board.dataset.maxLives || 5),
    gameOver: isGameOver(board),
    solved: board.dataset.solved === "1",
  };
}

function emitProgress(board, onChanged) {
  onChanged?.(progressState(board));
}

function rowCorrectlyCompleted(board, rowIndex) {
  const solution = board.__solution;
  const size = solution.length;
  let required = 0;
  let filledCorrect = 0;

  for (let c = 0; c < size; c += 1) {
    if (solution[rowIndex][c] === 1) required += 1;
    const cell = getCell(board, rowIndex, c);
    if (cell && cell.dataset.v === "1" && solution[rowIndex][c] === 1) filledCorrect += 1;
  }

  return required > 0 && filledCorrect === required;
}

function colCorrectlyCompleted(board, colIndex) {
  const solution = board.__solution;
  const size = solution.length;
  let required = 0;
  let filledCorrect = 0;

  for (let r = 0; r < size; r += 1) {
    if (solution[r][colIndex] === 1) required += 1;
    const cell = getCell(board, r, colIndex);
    if (cell && cell.dataset.v === "1" && solution[r][colIndex] === 1) filledCorrect += 1;
  }

  return required > 0 && filledCorrect === required;
}

function autoMarkCompletedLines(board) {
  const solution = board.__solution;
  if (!solution || solution.length === 0) return;

  const size = solution.length;

  for (let r = 0; r < size; r += 1) {
    if (!rowCorrectlyCompleted(board, r)) continue;
    for (let c = 0; c < size; c += 1) {
      if (solution[r][c] === 0) {
        const cell = getCell(board, r, c);
        if (cell && cell.dataset.v !== "1") setMark(cell, true);
      }
    }
  }

  for (let c = 0; c < size; c += 1) {
    if (!colCorrectlyCompleted(board, c)) continue;
    for (let r = 0; r < size; r += 1) {
      if (solution[r][c] === 0) {
        const cell = getCell(board, r, c);
        if (cell && cell.dataset.v !== "1") setMark(cell, true);
      }
    }
  }
}

function applyWrongFill(board, cell) {
  setFill(cell, false);
  setMark(cell, true);

  cell.classList.add("error");
  window.setTimeout(() => {
    cell.classList.remove("error");
  }, 220);

  setLives(board, getLives(board) - 1);
  if (getLives(board) <= 0) setGameOver(board, true);
}

function isSolved(board) {
  const solution = board.__solution;
  if (!solution || solution.length === 0) return false;

  const size = solution.length;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = getCell(board, r, c);
      const actual = cell?.dataset.v === "1" ? 1 : 0;
      if (actual !== solution[r][c]) return false;
    }
  }
  return true;
}

export function renderPicrossBoard(root, puzzle, options = {}) {
  const board = document.createElement("div");
  board.className = "picross";
  board.dataset.inputMode = options.inputMode || "fill";
  board.dataset.maxLives = "5";
  board.dataset.lives = "5";
  board.dataset.gameOver = "0";
  board.__solution = Array.isArray(puzzle.solution) ? puzzle.solution : [];

  const gridTemplate = `var(--picross-clue-width) repeat(${puzzle.size}, var(--picross-cell))`;

  const colClue = document.createElement("div");
  colClue.className = "clues-row";
  colClue.style.gridTemplateColumns = gridTemplate;

  const corner = document.createElement("div");
  corner.className = "picross-corner";
  colClue.appendChild(corner);

  for (let c = 0; c < puzzle.size; c += 1) {
    const el = document.createElement("div");
    el.className = "picross-col-clue";
    puzzle.colClues[c].forEach((num) => {
      const line = document.createElement("span");
      line.textContent = String(num);
      el.appendChild(line);
    });
    colClue.appendChild(el);
  }
  board.appendChild(colClue);

  for (let r = 0; r < puzzle.size; r += 1) {
    const row = document.createElement("div");
    row.className = "picross-row";
    row.style.gridTemplateColumns = gridTemplate;

    const rowClue = document.createElement("div");
    rowClue.className = "picross-row-clue";
    rowClue.textContent = puzzle.rowClues[r].join(" ");
    row.appendChild(rowClue);

    for (let c = 0; c < puzzle.size; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "picross-cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.dataset.v = "0";
      cell.textContent = "·";
      cell.title = `row ${r + 1} clue: ${puzzle.rowClues[r].join(" ")}`;

      cell.addEventListener("click", () => {
        if (isGameOver(board)) return;

        const mode = board.dataset.inputMode || "fill";
        if (mode === "mark") {
          setFill(cell, false);
          setMark(cell, !cell.classList.contains("mark"));
        } else if (cell.dataset.v === "1") {
          setFill(cell, false);
        } else {
          const rr = Number(cell.dataset.r);
          const cc = Number(cell.dataset.c);
          const isCorrect = board.__solution?.[rr]?.[cc] === 1;
          if (isCorrect) {
            setFill(cell, true);
          } else {
            applyWrongFill(board, cell);
          }
        }

        autoMarkCompletedLines(board);

        const solved = isSolved(board);
        if (solved) {
          setGameOver(board, true);
          board.dataset.solved = "1";
        } else {
          board.dataset.solved = "0";
        }

        emitProgress(board, options.onBoardChanged);
      });

      cell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (isGameOver(board)) return;
        setFill(cell, false);
        setMark(cell, !cell.classList.contains("mark"));
        autoMarkCompletedLines(board);
        emitProgress(board, options.onBoardChanged);
      });

      row.appendChild(cell);
    }

    board.appendChild(row);
  }

  root.appendChild(board);
  emitProgress(board, options.onBoardChanged);
}

export function setPicrossInputMode(root, mode) {
  const board = root.querySelector(".picross");
  if (!board) return;
  board.dataset.inputMode = mode;
}

export function clearPicrossBoard(root) {
  const board = root.querySelector(".picross");
  if (!board) return;

  const cells = board.querySelectorAll(".picross-cell");
  for (const cell of cells) {
    cell.dataset.v = "0";
    cell.classList.remove("on", "mark", "error");
    cell.textContent = "·";
  }

  setLives(board, Number(board.dataset.maxLives || 5));
  setGameOver(board, false);
  board.dataset.solved = "0";
}

export function collectPicrossAnswer(root, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const cells = root.querySelectorAll(".picross-cell");

  for (const cell of cells) {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    grid[r][c] = Number(cell.dataset.v || 0);
  }

  return grid;
}
