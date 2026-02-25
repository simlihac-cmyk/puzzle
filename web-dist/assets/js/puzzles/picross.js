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

function targetFillCount(rowClues) {
  return rowClues.flat().reduce((sum, n) => sum + (Number(n) > 0 ? Number(n) : 0), 0);
}

function groupsFromValues(values) {
  const groups = [];
  let run = 0;

  for (const value of values) {
    if (value === 1) {
      run += 1;
    } else if (run > 0) {
      groups.push(run);
      run = 0;
    }
  }

  if (run > 0) groups.push(run);
  return groups.length > 0 ? groups : [0];
}

function sameNumbers(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Number(a[i]) !== Number(b[i])) return false;
  }
  return true;
}

function rowValues(board, rowIndex) {
  const size = Number(board.dataset.size || 0);
  const values = [];
  for (let c = 0; c < size; c += 1) {
    const cell = getCell(board, rowIndex, c);
    values.push(cell?.dataset.v === "1" ? 1 : 0);
  }
  return values;
}

function colValues(board, colIndex) {
  const size = Number(board.dataset.size || 0);
  const values = [];
  for (let r = 0; r < size; r += 1) {
    const cell = getCell(board, r, colIndex);
    values.push(cell?.dataset.v === "1" ? 1 : 0);
  }
  return values;
}

function rowSolved(board, rowIndex) {
  const clues = board.__rowClues?.[rowIndex] || [0];
  return sameNumbers(groupsFromValues(rowValues(board, rowIndex)), clues);
}

function colSolved(board, colIndex) {
  const clues = board.__colClues?.[colIndex] || [0];
  return sameNumbers(groupsFromValues(colValues(board, colIndex)), clues);
}

function autoMarkCompletedLines(board) {
  const size = Number(board.dataset.size || 0);

  for (let r = 0; r < size; r += 1) {
    if (!rowSolved(board, r)) continue;
    for (let c = 0; c < size; c += 1) {
      const cell = getCell(board, r, c);
      if (cell && cell.dataset.v !== "1") setMark(cell, true);
    }
  }

  for (let c = 0; c < size; c += 1) {
    if (!colSolved(board, c)) continue;
    for (let r = 0; r < size; r += 1) {
      const cell = getCell(board, r, c);
      if (cell && cell.dataset.v !== "1") setMark(cell, true);
    }
  }
}

function isSolved(board) {
  const size = Number(board.dataset.size || 0);
  if (size <= 0) return false;

  for (let r = 0; r < size; r += 1) {
    if (!rowSolved(board, r)) return false;
  }
  for (let c = 0; c < size; c += 1) {
    if (!colSolved(board, c)) return false;
  }

  return true;
}

function progressState(board) {
  const cells = board.querySelectorAll(".picross-cell");
  const filled = [...cells].filter((c) => c.dataset.v === "1").length;

  return {
    filled,
    total: cells.length,
    target: Number(board.dataset.target || 0),
    solved: board.dataset.solved === "1",
  };
}

function emitProgress(board, onChanged) {
  onChanged?.(progressState(board));
}

export function renderPicrossBoard(root, puzzle, options = {}) {
  const board = document.createElement("div");
  board.className = "picross";
  board.dataset.inputMode = options.inputMode || "fill";
  board.dataset.size = String(puzzle.size);
  board.dataset.target = String(targetFillCount(puzzle.rowClues || []));
  board.dataset.solved = "0";
  board.__rowClues = Array.isArray(puzzle.rowClues) ? puzzle.rowClues : [];
  board.__colClues = Array.isArray(puzzle.colClues) ? puzzle.colClues : [];

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
      cell.title = `row ${r + 1}: ${puzzle.rowClues[r].join(" ")} | col ${c + 1}: ${puzzle.colClues[c].join(" ")}`;

      cell.addEventListener("click", () => {
        const mode = board.dataset.inputMode || "fill";
        if (mode === "mark") {
          setFill(cell, false);
          setMark(cell, !cell.classList.contains("mark"));
        } else if (cell.dataset.v === "1") {
          setFill(cell, false);
        } else {
          setFill(cell, true);
        }

        autoMarkCompletedLines(board);
        board.dataset.solved = isSolved(board) ? "1" : "0";
        emitProgress(board, options.onBoardChanged);
      });

      cell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        setFill(cell, false);
        setMark(cell, !cell.classList.contains("mark"));
        autoMarkCompletedLines(board);
        board.dataset.solved = isSolved(board) ? "1" : "0";
        emitProgress(board, options.onBoardChanged);
      });

      row.appendChild(cell);
    }

    board.appendChild(row);
  }

  board.__emitProgress = () => emitProgress(board, options.onBoardChanged);
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

  board.dataset.solved = "0";
  board.__emitProgress?.();
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
