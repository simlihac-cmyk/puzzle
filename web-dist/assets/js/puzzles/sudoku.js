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
