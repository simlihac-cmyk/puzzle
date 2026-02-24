function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seedText) {
  let seed = hashString(seedText);
  return function rand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle(arr, rand) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildSudoku(dateKey) {
  const rand = makeRng(`sudoku:${dateKey}`);
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const digits = shuffle(base, rand);

  const rowBands = shuffle([0, 1, 2], rand);
  const colBands = shuffle([0, 1, 2], rand);
  const rows = rowBands.flatMap((band) => shuffle([0, 1, 2], rand).map((r) => band * 3 + r));
  const cols = colBands.flatMap((band) => shuffle([0, 1, 2], rand).map((c) => band * 3 + c));

  const solution = [];
  for (let r = 0; r < 9; r += 1) {
    const row = [];
    for (let c = 0; c < 9; c += 1) {
      const value = (rows[r] * 3 + Math.floor(rows[r] / 3) + cols[c]) % 9;
      row.push(digits[value]);
    }
    solution.push(row);
  }

  const puzzle = solution.map((row) => row.slice());
  const positions = Array.from({ length: 81 }, (_, i) => i);
  const toHide = shuffle(positions, rand).slice(0, 45);
  toHide.forEach((idx) => {
    puzzle[Math.floor(idx / 9)][idx % 9] = 0;
  });

  return { puzzle, solution };
}

function buildPicross(dateKey) {
  const rand = makeRng(`picross:${dateKey}`);
  const size = 5;
  const solution = [];

  for (let r = 0; r < size; r += 1) {
    const row = [];
    for (let c = 0; c < size; c += 1) {
      row.push(rand() < 0.5 ? 1 : 0);
    }
    if (row.every((v) => v === 0)) {
      row[Math.floor(rand() * size)] = 1;
    }
    solution.push(row);
  }

  if (solution.every((row) => row.every((v) => v === 0))) {
    solution[2][2] = 1;
  }

  function lineToClue(line) {
    const groups = [];
    let run = 0;
    for (const v of line) {
      if (v) run += 1;
      else if (run > 0) {
        groups.push(run);
        run = 0;
      }
    }
    if (run > 0) groups.push(run);
    return groups.length ? groups : [0];
  }

  const rowClues = solution.map(lineToClue);
  const colClues = [];
  for (let c = 0; c < size; c += 1) {
    const col = [];
    for (let r = 0; r < size; r += 1) col.push(solution[r][c]);
    colClues.push(lineToClue(col));
  }

  return { size, rowClues, colClues, solution };
}

function getDailyPuzzle(mode, dateKey) {
  if (mode === "sudoku") {
    const { puzzle, solution } = buildSudoku(dateKey);
    return {
      mode,
      date: dateKey,
      puzzle,
      solution,
      meta: { size: 9, blanks: 45 },
    };
  }

  const picross = buildPicross(dateKey);
  return {
    mode,
    date: dateKey,
    puzzle: { size: picross.size, rowClues: picross.rowClues, colClues: picross.colClues },
    solution: picross.solution,
    meta: { size: picross.size },
  };
}

function isGrid(shape, grid) {
  if (!Array.isArray(grid) || grid.length !== shape) return false;
  return grid.every((row) => Array.isArray(row) && row.length === shape);
}

function validateSudokuSubmission(answer, daily) {
  if (!isGrid(9, answer)) return { ok: false, reason: "answer must be 9x9" };

  const given = daily.puzzle;
  const solution = daily.solution;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const v = Number(answer[r][c]);
      if (!Number.isInteger(v) || v < 1 || v > 9) {
        return { ok: false, reason: "sudoku values must be 1..9" };
      }
      if (given[r][c] !== 0 && v !== given[r][c]) {
        return { ok: false, reason: "cannot change given cells" };
      }
      if (v !== solution[r][c]) {
        return { ok: false, reason: "incorrect solution" };
      }
    }
  }

  return { ok: true };
}

function validatePicrossSubmission(answer, daily) {
  const solution = daily.solution;
  const size = solution.length;

  if (!isGrid(size, answer)) return { ok: false, reason: `answer must be ${size}x${size}` };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const v = Number(answer[r][c]);
      if (v !== 0 && v !== 1) {
        return { ok: false, reason: "picross values must be 0 or 1" };
      }
      if (v !== solution[r][c]) {
        return { ok: false, reason: "incorrect solution" };
      }
    }
  }

  return { ok: true };
}

function sanitizeDailyResponse(daily) {
  return {
    mode: daily.mode,
    date: daily.date,
    puzzle: daily.puzzle,
    meta: daily.meta,
  };
}

module.exports = {
  todayUTC,
  getDailyPuzzle,
  validateSudokuSubmission,
  validatePicrossSubmission,
  sanitizeDailyResponse,
};
