function key(r, c) {
  return `${r}:${c}`;
}

function conflictCellsFromGrid(grid) {
  const wrong = new Set();

  function markDuplicates(cells) {
    const map = new Map();
    for (const [r, c] of cells) {
      const v = grid[r][c];
      if (!Number.isInteger(v) || v < 1 || v > 9) continue;
      if (!map.has(v)) map.set(v, []);
      map.get(v).push([r, c]);
    }
    for (const entries of map.values()) {
      if (entries.length > 1) {
        for (const [r, c] of entries) wrong.add(key(r, c));
      }
    }
  }

  for (let r = 0; r < 9; r += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, c) => [r, c]));
  }

  for (let c = 0; c < 9; c += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, r) => [r, c]));
  }

  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const cells = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          cells.push([br * 3 + r, bc * 3 + c]);
        }
      }
      markDuplicates(cells);
    }
  }

  return wrong;
}

function liveGrid(root) {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const cells = root.querySelectorAll(".sudoku-cell");
  for (const cell of cells) {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    grid[r][c] = Number(cell.value || 0);
  }
  return grid;
}

function paintConflicts(root) {
  const wrong = conflictCellsFromGrid(liveGrid(root));
  const cells = root.querySelectorAll(".sudoku-cell");

  for (const cell of cells) {
    if (cell.readOnly) {
      cell.classList.remove("wrong");
      continue;
    }
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    cell.classList.toggle("wrong", wrong.has(key(r, c)));
  }
}

export function renderSudokuBoard(root, puzzle) {
  const wrap = document.createElement("div");
  wrap.className = "sudoku-grid";

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const input = document.createElement("input");
      input.className = "sudoku-cell";
      input.maxLength = 1;
      input.dataset.r = String(r);
      input.dataset.c = String(c);

      if ((c + 1) % 3 === 0 && c !== 8) input.classList.add("block-r");
      if ((r + 1) % 3 === 0 && r !== 8) input.classList.add("block-b");

      if (puzzle[r][c] !== 0) {
        input.value = String(puzzle[r][c]);
        input.readOnly = true;
        input.classList.add("given");
      } else {
        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^1-9]/g, "").slice(0, 1);
          paintConflicts(wrap);
        });
      }

      wrap.appendChild(input);
    }
  }

  root.appendChild(wrap);
}

export function collectSudokuAnswer(root) {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const cells = root.querySelectorAll(".sudoku-cell");
  for (const cell of cells) {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    grid[r][c] = Number(cell.value || 0);
  }
  return grid;
}
