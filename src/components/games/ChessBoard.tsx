import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";

const PIECE_GLYPH: Record<string, string> = {
  wP: "♙", wR: "♖", wN: "♘", wB: "♗", wQ: "♕", wK: "♔",
  bP: "♟", bR: "♜", bN: "♞", bB: "♝", bQ: "♛", bK: "♚",
};

export function ChessBoard({
  fen,
  onMove,
  myColor,
  disabled,
}: {
  fen: string;
  onMove: (san: string, nextFen: string, result: string | null) => void;
  myColor: "w" | "b";
  disabled?: boolean;
}) {
  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);
  const [selected, setSelected] = useState<Square | null>(null);

  const board = game.board();
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const sqAt = (r: number, c: number): Square => `${files[c]}${8 - r}` as Square;

  const legalTargets: Set<string> = selected
    ? new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to))
    : new Set();

  const click = (r: number, c: number) => {
    if (disabled) return;
    if (game.turn() !== myColor) return;
    const sq = sqAt(r, c);
    const piece = game.get(sq);
    if (selected && legalTargets.has(sq)) {
      try {
        const move = game.move({ from: selected, to: sq, promotion: "q" });
        if (move) {
          const result = game.isGameOver()
            ? game.isCheckmate()
              ? `${move.color === "w" ? "white" : "black"} wins`
              : "draw"
            : null;
          onMove(move.san, game.fen(), result);
          setSelected(null);
        }
      } catch {
        setSelected(null);
      }
      return;
    }
    if (piece && piece.color === myColor) setSelected(sq);
    else setSelected(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto select-none">
      <div className="grid grid-cols-8 rounded-lg overflow-hidden border border-gold/30 shadow-elegant">
        {board.map((row, r) =>
          row.map((p, c) => {
            const sq = sqAt(r, c);
            const dark = (r + c) % 2 === 1;
            const isSel = selected === sq;
            const isTarget = legalTargets.has(sq);
            return (
              <button
                key={sq}
                onClick={() => click(r, c)}
                className={`aspect-square flex items-center justify-center text-3xl sm:text-4xl transition-colors ${
                  dark
                    ? "bg-[oklch(0.22_0.014_260)]"
                    : "bg-[oklch(0.85_0.005_260)] text-[oklch(0.15_0.01_260)]"
                } ${isSel ? "ring-2 ring-inset ring-gold" : ""} ${
                  isTarget ? "after:content-[''] relative" : ""
                }`}
              >
                {p ? PIECE_GLYPH[`${p.color}${p.type.toUpperCase()}`] : null}
                {isTarget && (
                  <span
                    className={`absolute h-3 w-3 rounded-full ${
                      p ? "ring-2 ring-gold w-full h-full rounded-none bg-gold/20" : "bg-gold/70"
                    }`}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>You play {myColor === "w" ? "White" : "Black"}</span>
        <span>{game.turn() === myColor ? "Your turn" : "Waiting on opponent…"}</span>
      </div>
    </div>
  );
}
