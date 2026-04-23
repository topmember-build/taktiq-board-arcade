import { useState } from "react";
import {
  initialBoard,
  legalMovesForDie,
  applyMove,
  rollDice,
  winner,
  type Board,
  type Color,
  type Move,
} from "@/lib/games/backgammon";

export function BackgammonBoard({
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
  const [board, setBoard] = useState<Board>(state ?? initialBoard());
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [diceLeft, setDiceLeft] = useState<number[]>([]);
  const [selectedDie, setSelectedDie] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);

  const roll = () => {
    const d = rollDice();
    setDice(d);
    setDiceLeft(d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [d[0], d[1]]);
    setSelectedDie(null);
    setFrom(null);
  };

  const targets =
    from !== null && selectedDie !== null
      ? legalMovesForDie(board, myColor, selectedDie).filter((m) => m.from === from)
      : [];

  const handleClickPoint = (i: number) => {
    if (disabled || !dice) return;
    if (from === null) {
      setFrom(i);
      return;
    }
    const move = targets.find((m) => m.to === i);
    if (move) {
      const next = applyMove(board, move, myColor);
      setBoard(next);
      const remaining = diceLeft.slice();
      remaining.splice(remaining.indexOf(selectedDie!), 1);
      setDiceLeft(remaining);
      setFrom(null);
      setSelectedDie(null);
      const w = winner(next);
      if (w) onMove(move, next, `${w} wins`);
      else if (remaining.length === 0) onMove(move, next, null);
    } else {
      setFrom(null);
    }
  };

  const renderPoint = (i: number) => {
    const v = board.points[i];
    const count = Math.abs(v);
    const isWhite = v > 0;
    const isTarget = targets.some((m) => m.to === i);
    const isFrom = from === i;
    return (
      <button
        key={i}
        onClick={() => handleClickPoint(i)}
        className={`flex flex-col items-center justify-end h-32 w-8 sm:w-10 ${
          i % 2 === 0 ? "bg-[oklch(0.22_0.014_260)]" : "bg-[oklch(0.18_0.014_260)]"
        } ${isTarget ? "ring-2 ring-inset ring-gold" : ""} ${
          isFrom ? "ring-2 ring-inset ring-silver" : ""
        }`}
      >
        {Array.from({ length: Math.min(count, 5) }).map((_, k) => (
          <span
            key={k}
            className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full mb-0.5 ${
              isWhite
                ? "bg-gradient-to-br from-zinc-100 to-zinc-300"
                : "bg-gradient-to-br from-zinc-800 to-zinc-950 ring-1 ring-gold/40"
            }`}
          />
        ))}
        {count > 5 && <span className="text-[10px] text-gold">+{count - 5}</span>}
      </button>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      <div className="rounded-lg border border-gold/30 bg-gradient-card p-3 shadow-elegant overflow-x-auto">
        <div className="flex justify-center gap-1">
          {Array.from({ length: 12 }).map((_, idx) => renderPoint(11 - idx))}
        </div>
        <div className="h-4" />
        <div className="flex justify-center gap-1">
          {Array.from({ length: 12 }).map((_, idx) => renderPoint(12 + idx))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
        <button
          onClick={roll}
          disabled={!!dice && diceLeft.length > 0}
          className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground font-semibold disabled:opacity-50"
        >
          Roll dice
        </button>
        <div className="flex gap-2">
          {diceLeft.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDie(d)}
              className={`h-10 w-10 rounded grid place-items-center font-bold border ${
                selectedDie === d ? "border-gold bg-gold/10 text-gold" : "border-border"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          Bar W:{board.bar.white} B:{board.bar.black} · Off W:{board.off.white} B:{board.off.black}
        </div>
      </div>
    </div>
  );
}
