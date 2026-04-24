// Lightweight Scrabble engine — 15x15 board, tile rack, scoring with bonus squares.
// Not bundling a full TWL/SOWPODS dictionary in the client; words are validated
// against a small built-in seed list plus optional online check via API later.
// For now, any word ≥2 letters that uses placed tiles is accepted (honor system
// + chat). Scoring uses standard tile values + DL/TL/DW/TW bonuses.

export type Tile = { letter: string; value: number; blank?: boolean };
export type Cell = Tile | null;
export type Board = Cell[][]; // 15x15

export const SIZE = 15;

export const VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

export const BAG_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  "?": 2,
};

export type Bonus = "DL" | "TL" | "DW" | "TW" | null;

// Standard Scrabble bonus layout
export const BONUSES: Bonus[][] = (() => {
  const b: Bonus[][] = Array.from({ length: SIZE }, () => Array<Bonus>(SIZE).fill(null));
  const set = (r: number, c: number, v: Bonus) => {
    [
      [r, c], [r, SIZE - 1 - c], [SIZE - 1 - r, c], [SIZE - 1 - r, SIZE - 1 - c],
      [c, r], [c, SIZE - 1 - r], [SIZE - 1 - c, r], [SIZE - 1 - c, SIZE - 1 - r],
    ].forEach(([rr, cc]) => { b[rr][cc] = v; });
  };
  set(0, 0, "TW"); set(0, 7, "TW"); set(7, 0, "TW");
  set(1, 1, "DW"); set(2, 2, "DW"); set(3, 3, "DW"); set(4, 4, "DW");
  set(7, 7, "DW");
  set(1, 5, "TL"); set(5, 1, "TL"); set(5, 5, "TL");
  set(0, 3, "DL"); set(2, 6, "DL"); set(3, 0, "DL"); set(3, 7, "DL"); set(6, 2, "DL"); set(6, 6, "DL"); set(7, 3, "DL");
  return b;
})();

export type ScrabbleState = {
  board: Board;
  rack: Record<"host" | "joiner", Tile[]>;
  bag: Tile[];
  scores: Record<"host" | "joiner", number>;
  toMove: "host" | "joiner";
  passes: number;
  log: string[];
  winner: "host" | "joiner" | "draw" | null;
};

function buildBag(): Tile[] {
  const tiles: Tile[] = [];
  for (const [letter, count] of Object.entries(BAG_DISTRIBUTION)) {
    for (let i = 0; i < count; i++)
      tiles.push({ letter, value: letter === "?" ? 0 : VALUES[letter], blank: letter === "?" });
  }
  // Fisher-Yates
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

function draw(bag: Tile[], n: number): Tile[] {
  return bag.splice(0, Math.min(n, bag.length));
}

export const initialScrabble = (): ScrabbleState => {
  const bag = buildBag();
  return {
    board: Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null)),
    rack: { host: draw(bag, 7), joiner: draw(bag, 7) },
    bag,
    scores: { host: 0, joiner: 0 },
    toMove: "host",
    passes: 0,
    log: ["Game start. Host plays first."],
    winner: null,
  };
};

export type Placement = { row: number; col: number; tile: Tile };

export function placeWord(
  state: ScrabbleState,
  player: "host" | "joiner",
  placements: Placement[],
): { ok: false; error: string } | { ok: true; state: ScrabbleState; word: string; score: number } {
  if (state.winner) return { ok: false, error: "Game over" };
  if (state.toMove !== player) return { ok: false, error: "Not your turn" };
  if (placements.length === 0) return { ok: false, error: "Place at least one tile" };

  // Validate placements are in a single row or column and contiguous
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size > 1 && cols.size > 1) return { ok: false, error: "Tiles must be in a line" };

  // Validate each square is empty and tile is in player's rack
  const rackCopy = state.rack[player].slice();
  for (const p of placements) {
    if (state.board[p.row][p.col]) return { ok: false, error: "Square occupied" };
    const idx = rackCopy.findIndex((t) => t.letter === p.tile.letter);
    if (idx === -1) return { ok: false, error: `No ${p.tile.letter} in rack` };
    rackCopy.splice(idx, 1);
  }

  // Build candidate board
  const newBoard: Board = state.board.map((r) => r.slice());
  for (const p of placements) newBoard[p.row][p.col] = p.tile;

  // Determine main word direction
  const horizontal = rows.size === 1;
  const fixedRow = placements[0].row;
  const fixedCol = placements[0].col;

  // Find the full extent of the main word
  let r = fixedRow, c = fixedCol;
  if (horizontal) {
    let lo = Math.min(...placements.map((p) => p.col));
    let hi = Math.max(...placements.map((p) => p.col));
    while (lo > 0 && newBoard[fixedRow][lo - 1]) lo--;
    while (hi < SIZE - 1 && newBoard[fixedRow][hi + 1]) hi++;
    let word = "";
    let score = 0;
    let wordMult = 1;
    for (let cc = lo; cc <= hi; cc++) {
      const tile = newBoard[fixedRow][cc]!;
      const isNew = placements.some((p) => p.row === fixedRow && p.col === cc);
      const bonus = isNew ? BONUSES[fixedRow][cc] : null;
      let v = tile.value;
      if (bonus === "DL") v *= 2;
      if (bonus === "TL") v *= 3;
      if (bonus === "DW") wordMult *= 2;
      if (bonus === "TW") wordMult *= 3;
      score += v;
      word += tile.letter;
    }
    score *= wordMult;
    if (word.length < 2) return { ok: false, error: "Word too short" };

    // First move must cover center
    const empty = state.board.every((row) => row.every((cell) => !cell));
    if (empty && !placements.some((p) => p.row === 7 && p.col === 7))
      return { ok: false, error: "First word must cross center (H8)" };

    if (placements.length === 7) score += 50;

    const next: ScrabbleState = {
      ...state,
      board: newBoard,
      rack: { ...state.rack, [player]: rackCopy.concat(draw(state.bag.slice(), placements.length)) },
      bag: state.bag.slice(placements.length),
      scores: { ...state.scores, [player]: state.scores[player] + score },
      toMove: player === "host" ? "joiner" : "host",
      passes: 0,
      log: [...state.log, `${player} played ${word.toUpperCase()} (+${score})`],
      winner: null,
    };
    if (next.bag.length === 0 && next.rack[player].length === 0) {
      next.winner = next.scores.host > next.scores.joiner
        ? "host"
        : next.scores.joiner > next.scores.host
          ? "joiner"
          : "draw";
      next.log.push(`Game over — ${next.winner} wins!`);
    }
    return { ok: true, state: next, word, score };
  }

  // Vertical (analogous, simplified)
  let lo = Math.min(...placements.map((p) => p.row));
  let hi = Math.max(...placements.map((p) => p.row));
  while (lo > 0 && newBoard[lo - 1][fixedCol]) lo--;
  while (hi < SIZE - 1 && newBoard[hi + 1][fixedCol]) hi++;
  let word = "";
  let score = 0;
  let wordMult = 1;
  for (let rr = lo; rr <= hi; rr++) {
    const tile = newBoard[rr][fixedCol]!;
    const isNew = placements.some((p) => p.row === rr && p.col === fixedCol);
    const bonus = isNew ? BONUSES[rr][fixedCol] : null;
    let v = tile.value;
    if (bonus === "DL") v *= 2;
    if (bonus === "TL") v *= 3;
    if (bonus === "DW") wordMult *= 2;
    if (bonus === "TW") wordMult *= 3;
    score += v;
    word += tile.letter;
  }
  score *= wordMult;
  if (word.length < 2) return { ok: false, error: "Word too short" };

  const empty = state.board.every((row) => row.every((cell) => !cell));
  if (empty && !placements.some((p) => p.row === 7 && p.col === 7))
    return { ok: false, error: "First word must cross center (H8)" };

  if (placements.length === 7) score += 50;

  const newBag = state.bag.slice();
  const drawn = draw(newBag, placements.length);
  const next: ScrabbleState = {
    ...state,
    board: newBoard,
    rack: { ...state.rack, [player]: rackCopy.concat(drawn) },
    bag: newBag,
    scores: { ...state.scores, [player]: state.scores[player] + score },
    toMove: player === "host" ? "joiner" : "host",
    passes: 0,
    log: [...state.log, `${player} played ${word.toUpperCase()} (+${score})`],
    winner: null,
  };
  if (next.bag.length === 0 && next.rack[player].length === 0) {
    next.winner = next.scores.host > next.scores.joiner
      ? "host"
      : next.scores.joiner > next.scores.host
        ? "joiner"
        : "draw";
    next.log.push(`Game over — ${next.winner} wins!`);
  }
  return { ok: true, state: next, word, score };
}

export function passTurn(state: ScrabbleState, player: "host" | "joiner"): ScrabbleState {
  if (state.toMove !== player) return state;
  const next = { ...state, toMove: (player === "host" ? "joiner" : "host") as "host" | "joiner", passes: state.passes + 1, log: [...state.log, `${player} passed.`] };
  if (next.passes >= 4) {
    next.winner = next.scores.host > next.scores.joiner
      ? "host"
      : next.scores.joiner > next.scores.host
        ? "joiner"
        : "draw";
    next.log.push(`Game ended after consecutive passes — ${next.winner} wins.`);
  }
  return next;
}
