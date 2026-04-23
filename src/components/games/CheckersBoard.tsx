import { useMemo, useState } from "react";
import {
  initialBoard,
  legalMoves,
  applyMove,
  winner,
  type Board,
  type Color,
  type Move,
} from "@/lib/games/checkers";

export function CheckersBoard({
  state,
  onMove,
  myColor,
  disabled,
}: {
  state: Board | null;
  onMove: (move: Move, nextState: Board, result: string | null) => void;
  myColor: Color;
  disabled?: boolean;
}) {
  const board = state ?? useMemo(initialBoard, []);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const moves = legalMoves(board, myColor);
  const targets = selected
    ? moves.filter((m) => m.from[0] === selected[0] && m.from[1] === selected[1])
    : [];

  const click = (r: number, c: number) => {
    if (disabled) return;
    const cell = board[r][c];
    const mySign = myColor === "red" ? 1 : -1;
    if (selected) {
      const move = targets.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) {
        const next = applyMove(board, move);
        const w = winner(next, myColor === "red" ? "black" : "red");
        onMove(move, next, w ? `${w} wins` : null);
        setSelected(null);
        return;
      }
    }
    if (cell && Math.sign(cell) === mySign && moves.some((m) => m.from[0] === r && m.from[1] === c))
      setSelected([r, c]);
    else setSelected(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto select-none">
      <div className="grid grid-cols-8 rounded-lg overflow-hidden border border-gold/30 shadow-elegant">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected && selected[0] === r && selected[1] === c;
            const isTarget = targets.some((m) => m.to[0] === r && m.to[1] === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => click(r, c)}
                className={`aspect-square flex items-center justify-center transition-colors ${
                  dark ? "bg-[oklch(0.18_0.014_260)]" : "bg-[oklch(0.78_0.005_260)]"
                } ${isSel ? "ring-2 ring-inset ring-gold" : ""}`}
              >
                {cell !== 0 && (
                  <div
                    className={`h-3/4 w-3/4 rounded-full grid place-items-center text-xs font-bold ${
                      cell > 0
                        ? "bg-gradient-to-br from-red-500 to-red-700 text-white"
                        : "bg-gradient-to-br from-zinc-800 to-zinc-950 text-gold"
                    }`}
                  >
                    {Math.abs(cell) === 2 ? "♔" : ""}
                  </div>
                )}
                {isTarget && !cell && <span className="h-3 w-3 rounded-full bg-gold/70" />}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>You play {myColor}</span>
        <span>{disabled ? "Waiting on opponent…" : moves.length ? "Your turn" : "No moves"}</span>
      </div>
    </div>
  );
}
