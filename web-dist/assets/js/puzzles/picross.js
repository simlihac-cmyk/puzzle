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

export function renderPicrossBoard(root, puzzle) {
  const board = document.createElement("div");
  board.className = "picross";

  const colClue = document.createElement("div");
  colClue.className = "clues-row";
  for (let c = 0; c < puzzle.size; c += 1) {
    const el = document.createElement("div");
    el.textContent = puzzle.colClues[c].join(" ");
    el.style.textAlign = "center";
    el.style.fontSize = "12px";
    colClue.appendChild(el);
  }
  board.appendChild(colClue);

  for (let r = 0; r < puzzle.size; r += 1) {
    const row = document.createElement("div");
    row.className = "picross-row";

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
        const nextOn = cell.dataset.v !== "1";
        setFill(cell, nextOn);
      });

      cell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        setFill(cell, false);
        setMark(cell, !cell.classList.contains("mark"));
      });

      row.appendChild(cell);
    }

    board.appendChild(row);
  }

  root.appendChild(board);
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
