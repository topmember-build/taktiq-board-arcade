// Minimal but correct American Checkers (8x8) engine.
// Pieces: 0 empty, 1 red man, 2 red king, -1 black man, -2 black king
// Red moves down (+row), Black moves up (-row). Mandatory captures enforced.

export type Cell = 0 | 1 | 2 | -1 | -2;
export type Board = Cell[][];
export type Color = "red" | "black";

export type Move = {
  from: [number, number];
  to: [number, number];
  captures?: [number, number][];
};

export const initialBoard = (): Board => {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(0) as Cell[]);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = 1;
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = -1;
  return b;
};

const sign = (p: Cell) => (p > 0 ? 1 : p < 0 ? -1 : 0);
const isKing = (p: Cell) => Math.abs(p) === 2;
const inBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

function manDirs(p: Cell): [number, number][] {
  if (isKing(p))
    return [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
  return p > 0
    ? [
        [1, 1],
        [1, -1],
      ]
    : [
        [-1, 1],
        [-1, -1],
      ];
}

function captureDirs(): [number, number][] {
  return [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
}

function findCaptures(
  board: Board,
  r: number,
  c: number,
  color: Color,
  chain: [number, number][] = [],
): Move[] {
  const out: Move[] = [];
  const piece = board[r][c];
  if (!piece) return out;
  const mySign = color === "red" ? 1 : -1;
  for (const [dr, dc] of captureDirs()) {
    if (!isKing(piece) && Math.sign(dr) !== mySign) continue;
    const mr = r + dr,
      mc = c + dc;
    const lr = r + 2 * dr,
      lc = c + 2 * dc;
    if (!inBoard(lr, lc)) continue;
    if (board[lr][lc] !== 0) continue;
    const mid = board[mr][mc];
    if (!mid || sign(mid) === mySign) continue;
    // simulate
    const next: Board = board.map((row) => row.slice() as Cell[]);
    next[r][c] = 0;
    next[mr][mc] = 0;
    let placed: Cell = piece;
    if (!isKing(piece) && ((mySign === 1 && lr === 7) || (mySign === -1 && lr === 0)))
      placed = (mySign * 2) as Cell;
    next[lr][lc] = placed;
    const further = findCaptures(next, lr, lc, color, [...chain, [mr, mc]]);
    if (further.length === 0) {
      out.push({ from: [r, c], to: [lr, lc], captures: [...chain, [mr, mc]] });
    } else {
      for (const f of further) {
        out.push({ from: [r, c], to: f.to, captures: [...(f.captures ?? []), ...chain] });
      }
    }
  }
  return out;
}

export function legalMoves(board: Board, color: Color): Move[] {
  const mySign = color === "red" ? 1 : -1;
  const captures: Move[] = [];
  const quiet: Move[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || sign(p) !== mySign) continue;
      const caps = findCaptures(board, r, c, color);
      if (caps.length) {
        captures.push(...caps);
        continue;
      }
      for (const [dr, dc] of manDirs(p)) {
        const nr = r + dr,
          nc = c + dc;
        if (!inBoard(nr, nc)) continue;
        if (board[nr][nc] === 0) quiet.push({ from: [r, c], to: [nr, nc] });
      }
    }
  // Mandatory capture rule
  return captures.length ? captures : quiet;
}

export function applyMove(board: Board, move: Move): Board {
  const next: Board = board.map((row) => row.slice() as Cell[]);
  const piece = next[move.from[0]][move.from[1]];
  next[move.from[0]][move.from[1]] = 0;
  if (move.captures) for (const [r, c] of move.captures) next[r][c] = 0;
  let placed: Cell = piece;
  const mySign = sign(piece);
  if (!isKing(piece) && ((mySign === 1 && move.to[0] === 7) || (mySign === -1 && move.to[0] === 0)))
    placed = (mySign * 2) as Cell;
  next[move.to[0]][move.to[1]] = placed;
  return next;
}

export function winner(board: Board, toMove: Color): Color | null {
  const moves = legalMoves(board, toMove);
  if (moves.length === 0) return toMove === "red" ? "black" : "red";
  return null;
}
