// Lightweight Backgammon engine — board is 24 points + bar + bear-off.
// White (+) moves toward point 23, Black (-) moves toward point 0.
// Stores positive count for white pieces, negative for black on each point.

export type Color = "white" | "black";
export type Board = {
  points: number[]; // length 24
  bar: { white: number; black: number };
  off: { white: number; black: number };
};

export const initialBoard = (): Board => ({
  points: [
    2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5, -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2,
  ],
  bar: { white: 0, black: 0 },
  off: { white: 0, black: 0 },
});

export const rollDice = (): [number, number] =>
  [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] as [number, number];

const dir = (color: Color) => (color === "white" ? 1 : -1);

function ownership(point: number, color: Color) {
  if (point === 0) return "empty";
  if (color === "white") return point > 0 ? "own" : point === -1 ? "blot" : "blocked";
  return point < 0 ? "own" : point === 1 ? "blot" : "blocked";
}

function inHomeBoard(board: Board, color: Color): boolean {
  // home for white = points 18..23, black = 0..5
  const range = color === "white" ? [0, 17] : [6, 23];
  for (let i = range[0]; i <= range[1]; i++) {
    const v = board.points[i];
    if ((color === "white" && v > 0) || (color === "black" && v < 0)) return false;
  }
  return board.bar[color] === 0;
}

export type Move = { from: number; to: number; die: number; bear?: boolean; bar?: boolean };

export function legalMovesForDie(board: Board, color: Color, die: number): Move[] {
  const moves: Move[] = [];
  const d = dir(color);

  // Must enter from bar first
  if (board.bar[color] > 0) {
    const entry = color === "white" ? die - 1 : 24 - die;
    const own = ownership(board.points[entry], color);
    if (own === "empty" || own === "own" || own === "blot")
      moves.push({ from: -1, to: entry, die, bar: true });
    return moves;
  }

  for (let i = 0; i < 24; i++) {
    const v = board.points[i];
    if ((color === "white" && v <= 0) || (color === "black" && v >= 0)) continue;
    const to = i + d * die;
    if (to >= 0 && to < 24) {
      const own = ownership(board.points[to], color);
      if (own !== "blocked") moves.push({ from: i, to, die });
    } else if (inHomeBoard(board, color)) {
      // bearing off
      const farthest = color === "white" ? findFarthest(board, color) : findFarthest(board, color);
      if (
        (color === "white" && to === 24 && i === 24 - die) ||
        (color === "black" && to === -1 && i === die - 1) ||
        (color === "white" && to >= 24 && farthest === i) ||
        (color === "black" && to <= -1 && farthest === i)
      ) {
        moves.push({ from: i, to: color === "white" ? 24 : -1, die, bear: true });
      }
    }
  }
  return moves;
}

function findFarthest(board: Board, color: Color): number {
  if (color === "white") {
    for (let i = 18; i < 24; i++) if (board.points[i] > 0) return i;
  } else {
    for (let i = 5; i >= 0; i--) if (board.points[i] < 0) return i;
  }
  return -1;
}

export function applyMove(board: Board, move: Move, color: Color): Board {
  const next: Board = {
    points: board.points.slice(),
    bar: { ...board.bar },
    off: { ...board.off },
  };
  const sign = color === "white" ? 1 : -1;
  if (move.bar) {
    next.bar[color] -= 1;
  } else {
    next.points[move.from] -= sign;
  }
  if (move.bear) {
    next.off[color] += 1;
  } else {
    // hit blot
    const dest = next.points[move.to];
    if (color === "white" && dest === -1) {
      next.points[move.to] = 0;
      next.bar.black += 1;
    } else if (color === "black" && dest === 1) {
      next.points[move.to] = 0;
      next.bar.white += 1;
    }
    next.points[move.to] += sign;
  }
  return next;
}

export function winner(board: Board): Color | null {
  if (board.off.white >= 15) return "white";
  if (board.off.black >= 15) return "black";
  return null;
}
