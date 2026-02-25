function cellKey(r, c) {
  return `${r}:${c}`;
}

function parseNotes(cell) {
  const raw = cell.dataset.notes || "";
  if (!raw) return [];
  return raw.split(",").map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= 9).sort((a, b) => a - b);
}

function setNotes(cell, notes) {
  const sorted = [...new Set(notes)].sort((a, b) => a - b);
  cell.dataset.notes = sorted.join(",");
  renderCellContent(cell, sorted);
}

function renderCellContent(cell, notesArg) {
  const notes = notesArg || parseNotes(cell);
  cell.innerHTML = "";

  if (cell.classList.contains("given")) {
    const span = document.createElement("span");
    span.className = "sudoku-main";
    span.textContent = cell.dataset.given || "";
    cell.appendChild(span);
    return;
  }

  if (notes.length === 0) {
    return;
  }

  if (notes.length === 1) {
    const span = document.createElement("span");
    span.className = "sudoku-main";
    span.textContent = String(notes[0]);
    cell.appendChild(span);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "sudoku-notes";
  for (let i = 1; i <= 9; i += 1) {
    const note = document.createElement("span");
    note.className = "sudoku-note";
    note.textContent = notes.includes(i) ? String(i) : "";
    grid.appendChild(note);
  }
  cell.appendChild(grid);
}

function buildSinglesGrid(board) {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const cells = board.querySelectorAll(".sudoku-cell");
  for (const cell of cells) {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    if (cell.classList.contains("given")) {
      grid[r][c] = Number(cell.dataset.given || 0);
      continue;
    }
    const notes = parseNotes(cell);
    grid[r][c] = notes.length === 1 ? notes[0] : 0;
  }
  return grid;
}

function conflictKeys(board) {
  const grid = buildSinglesGrid(board);
  const wrong = new Set();

  function scanGroup(coords) {
    const map = new Map();
    for (const [r, c] of coords) {
      const v = grid[r][c];
      if (!v) continue;
      if (!map.has(v)) map.set(v, []);
      map.get(v).push([r, c]);
    }
    for (const group of map.values()) {
      if (group.length > 1) {
        for (const [r, c] of group) wrong.add(cellKey(r, c));
      }
    }
  }

  for (let r = 0; r < 9; r += 1) {
    scanGroup(Array.from({ length: 9 }, (_, c) => [r, c]));
  }
  for (let c = 0; c < 9; c += 1) {
    scanGroup(Array.from({ length: 9 }, (_, r) => [r, c]));
  }
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const coords = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) coords.push([br * 3 + r, bc * 3 + c]);
      }
      scanGroup(coords);
    }
  }

  return wrong;
}

function stats(board) {
  const editable = board.querySelectorAll(".sudoku-cell:not(.given)");
  let singles = 0;
  let multi = 0;
  let empty = 0;

  for (const cell of editable) {
    const notes = parseNotes(cell);
    if (notes.length === 0) empty += 1;
    else if (notes.length === 1) singles += 1;
    else multi += 1;
  }

  return {
    singles,
    multi,
    empty,
    totalEditable: editable.length,
  };
}

function clearSelected(board) {
  board.querySelectorAll(".sudoku-cell.selected").forEach((c) => c.classList.remove("selected"));
}

function selectCell(board, cell) {
  if (!cell || cell.classList.contains("given")) return;
  clearSelected(board);
  cell.classList.add("selected");
}

function paintConflicts(board) {
  const wrong = conflictKeys(board);
  const cells = board.querySelectorAll(".sudoku-cell");
  for (const cell of cells) {
    if (cell.classList.contains("given")) {
      cell.classList.remove("wrong");
      continue;
    }
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const notes = parseNotes(cell);
    cell.classList.toggle("wrong", notes.length === 1 && wrong.has(cellKey(r, c)));
  }
  return wrong.size;
}

function notify(board, onBoardChanged) {
  const s = stats(board);
  const conflicts = paintConflicts(board);
  onBoardChanged?.({ ...s, conflicts });
}

function createPopup(root, board, onBoardChanged) {
  const popup = root.querySelector("#sudokuPopup");
  popup.innerHTML = "";
  popup.classList.add("hidden");

  const pad = document.createElement("div");
  pad.className = "sudoku-popup-grid";

  let activeCell = null;

  function refreshPadState() {
    const notes = activeCell ? parseNotes(activeCell) : [];
    popup.querySelectorAll(".popup-num").forEach((btn) => {
      const n = Number(btn.dataset.n);
      btn.classList.toggle("active", notes.includes(n));
    });
  }

  function closePopup() {
    popup.classList.add("hidden");
    activeCell = null;
    refreshPadState();
  }

  function placePopup(cell) {
    popup.classList.remove("hidden");
    popup.style.visibility = "hidden";
    const cellRect = cell.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    let left = cellRect.left + (cellRect.width / 2) - (popupRect.width / 2);
    let top = cellRect.bottom + 8;

    if (top + popupRect.height > window.innerHeight - 8) {
      top = cellRect.top - popupRect.height - 8;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - popupRect.width - 8));
    top = Math.max(8, top);

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
    popup.style.visibility = "visible";
  }

  function toggleNumber(n) {
    if (!activeCell) return;
    const notes = parseNotes(activeCell);
    const has = notes.includes(n);
    const next = has ? notes.filter((v) => v !== n) : [...notes, n];
    setNotes(activeCell, next);
    refreshPadState();
    notify(board, onBoardChanged);
  }

  for (let n = 1; n <= 9; n += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "popup-num";
    b.dataset.n = String(n);
    b.textContent = String(n);
    b.addEventListener("click", () => toggleNumber(n));
    pad.appendChild(b);
  }

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "popup-clear";
  clearBtn.textContent = "Clear";
  clearBtn.addEventListener("click", () => {
    if (!activeCell) return;
    setNotes(activeCell, []);
    refreshPadState();
    notify(board, onBoardChanged);
  });

  popup.appendChild(pad);
  popup.appendChild(clearBtn);

  const controller = new AbortController();

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (popup.contains(target)) return;
      if (target.classList?.contains("sudoku-cell") && !target.classList.contains("given")) {
        activeCell = target;
        selectCell(board, target);
        placePopup(target);
        refreshPadState();
        return;
      }
      closePopup();
      clearSelected(board);
    },
    { capture: true, signal: controller.signal }
  );

  window.addEventListener(
    "resize",
    () => {
      if (activeCell) placePopup(activeCell);
    },
    { signal: controller.signal }
  );

  return {
    openFor(cell) {
      activeCell = cell;
      selectCell(board, cell);
      placePopup(cell);
      refreshPadState();
    },
    dispose() {
      controller.abort();
    },
  };
}

export function renderSudokuBoard(root, puzzle, options = {}) {
  if (root.__sudokuCleanup) {
    root.__sudokuCleanup();
    root.__sudokuCleanup = null;
  }

  const board = document.createElement("div");
  board.className = "sudoku-grid";

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "sudoku-cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add("block-r");
      if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("block-b");

      if (puzzle[r][c] !== 0) {
        cell.classList.add("given");
        cell.dataset.given = String(puzzle[r][c]);
        renderCellContent(cell, [puzzle[r][c]]);
      } else {
        cell.dataset.notes = "";
        renderCellContent(cell, []);
      }

      board.appendChild(cell);
    }
  }

  root.appendChild(board);

  const popupControl = createPopup(root, board, options.onBoardChanged);

  board.querySelectorAll(".sudoku-cell:not(.given)").forEach((cell) => {
    cell.addEventListener("click", () => popupControl.openFor(cell));
  });

  notify(board, options.onBoardChanged);

  root.__sudokuCleanup = () => popupControl.dispose();
}

export function hasMultipleSudokuNotes(root) {
  const cells = root.querySelectorAll(".sudoku-cell:not(.given)");
  return [...cells].some((cell) => parseNotes(cell).length > 1);
}

export function getSudokuInputStats(root) {
  const board = root.querySelector(".sudoku-grid");
  if (!board) return { singles: 0, multi: 0, empty: 0, totalEditable: 0, conflicts: 0 };
  return { ...stats(board), conflicts: conflictKeys(board).size };
}

export function clearSudokuInputs(root) {
  const cells = root.querySelectorAll(".sudoku-cell:not(.given)");
  for (const cell of cells) {
    setNotes(cell, []);
    cell.classList.remove("wrong", "selected");
  }
  const board = root.querySelector(".sudoku-grid");
  if (board) paintConflicts(board);
}

export function collectSudokuAnswer(root) {
  const board = root.querySelector(".sudoku-grid");
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  if (!board) return grid;

  const cells = board.querySelectorAll(".sudoku-cell");
  for (const cell of cells) {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    if (cell.classList.contains("given")) {
      grid[r][c] = Number(cell.dataset.given || 0);
      continue;
    }

    const notes = parseNotes(cell);
    grid[r][c] = notes.length === 1 ? notes[0] : 0;
  }
  return grid;
}
