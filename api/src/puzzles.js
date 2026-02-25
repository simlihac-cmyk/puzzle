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

function difficultyToBlanks(difficulty) {
  if (difficulty === "easy") return 36;
  if (difficulty === "hard") return 54;
  return 45;
}

function buildSudoku(dateKey, difficulty) {
  const rand = makeRng(`sudoku:${dateKey}:${difficulty}`);
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
  const blanks = difficultyToBlanks(difficulty);
  const toHide = shuffle(positions, rand).slice(0, blanks);
  toHide.forEach((idx) => {
    puzzle[Math.floor(idx / 9)][idx % 9] = 0;
  });

  return { puzzle, solution, blanks };
}

const PICROSS_TEMPLATES = {
  6: [
    {
      title: "Heart",
      pattern: [
        ".##.#.",
        "######",
        "######",
        ".####.",
        "..##..",
        "..##..",
      ],
    },
    {
      title: "Flower",
      pattern: [
        "..##..",
        ".####.",
        "######",
        "..##..",
        "..##..",
        ".####.",
      ],
    },
    {
      title: "Smile",
      pattern: [
        "......",
        ".#..#.",
        "......",
        ".#..#.",
        "..##..",
        ".####.",
      ],
    },
  ],
  7: [
    {
      title: "House",
      pattern: [
        "...#...",
        "..###..",
        ".#####.",
        "#######",
        "##...##",
        "##...##",
        "#######",
      ],
    },
    {
      title: "Rocket",
      pattern: [
        "...#...",
        "..###..",
        "..###..",
        ".#####.",
        ".#####.",
        "..###..",
        ".#...#.",
      ],
    },
    {
      title: "Diamond",
      pattern: [
        "...#...",
        "..###..",
        ".#####.",
        "#######",
        ".#####.",
        "..###..",
        "...#...",
      ],
    },
  ],
  8: [
    {
      title: "Crown",
      pattern: [
        "..####..",
        ".######.",
        "##.##.##",
        "########",
        "########",
        ".##..##.",
        ".##..##.",
        "..####..",
      ],
    },
    {
      title: "Fish",
      pattern: [
        "...##...",
        "..####..",
        ".######.",
        "########",
        "########",
        ".######.",
        "..####..",
        "...##...",
      ],
    },
    {
      title: "Bunny",
      pattern: [
        "##....##",
        "##....##",
        ".######.",
        "..####..",
        ".######.",
        "##.##.##",
        "##....##",
        ".#....#.",
      ],
    },
  ],
};

function difficultyToPicrossSize(difficulty) {
  if (difficulty === "easy") return 6;
  if (difficulty === "hard") return 8;
  return 7;
}

function lineToClue(line) {
  const groups = [];
  let run = 0;

  for (const v of line) {
    if (v) {
      run += 1;
    } else if (run > 0) {
      groups.push(run);
      run = 0;
    }
  }

  if (run > 0) groups.push(run);
  return groups.length ? groups : [0];
}

function patternToGrid(pattern) {
  return pattern.map((row) => row.split("").map((ch) => (ch === "#" ? 1 : 0)));
}

function buildPicross(dateKey, difficulty) {
  const size = difficultyToPicrossSize(difficulty);
  const rand = makeRng(`picross:${dateKey}:${difficulty}`);
  const templates = PICROSS_TEMPLATES[size];
  const chosen = templates[Math.floor(rand() * templates.length)];

  const solution = patternToGrid(chosen.pattern);
  const rowClues = solution.map(lineToClue);

  const colClues = [];
  for (let c = 0; c < size; c += 1) {
    const col = [];
    for (let r = 0; r < size; r += 1) col.push(solution[r][c]);
    colClues.push(lineToClue(col));
  }

  return {
    size,
    title: chosen.title,
    rowClues,
    colClues,
    solution,
  };
}

function getDailyPuzzle(mode, dateKey, difficulty = "medium") {
  if (mode === "sudoku") {
    const { puzzle, solution, blanks } = buildSudoku(dateKey, difficulty);
    return {
      mode,
      date: dateKey,
      difficulty,
      puzzle,
      solution,
      meta: { size: 9, blanks },
    };
  }

  const picross = buildPicross(dateKey, difficulty);
  return {
    mode,
    date: dateKey,
    difficulty,
    puzzle: {
      size: picross.size,
      title: picross.title,
      rowClues: picross.rowClues,
      colClues: picross.colClues,
    },
    solution: picross.solution,
    meta: { size: picross.size, difficulty },
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
    difficulty: daily.difficulty,
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
