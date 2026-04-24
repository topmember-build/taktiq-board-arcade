import { useState } from "react";
import { BONUSES, SIZE, placeWord, passTurn, type Placement, type ScrabbleState, type Tile } from "@/lib/games/scrabble";
import { toast } from "sonner";

const bonusBg: Record<string, string> = {
  DL: "bg-[oklch(0.55_0.12_220)]/40",
  TL: "bg-[oklch(0.55_0.16_240)]/60",
  DW: "bg-[oklch(0.55_0.16_20)]/40",
  TW: "bg-[oklch(0.55_0.18_30)]/70",
};

export function ScrabbleBoard({
  state,
  myColor,
  disabled,
  onAction,
}: {
  state: ScrabbleState;
  myColor: "host" | "joiner";
  disabled: boolean;
  onAction: (next: ScrabbleState, result: string | null) => void;
}) {
  const [pending, setPending] = useState<Placement[]>([]);
  const [selectedRackIdx, setSelectedRackIdx] = useState<number | null>(null);

  const isMyTurn = state.toMove === myColor && !state.winner;
  const rack = state.rack[myColor] ?? [];

  const tileAt = (r: number, c: number): Tile | null => {
    if (state.board[r][c]) return state.board[r][c];
    const p = pending.find((p) => p.row === r && p.col === c);
    return p ? p.tile : null;
  };

  const placeAt = (r: number, c: number) => {
    if (!isMyTurn || disabled) return;
    if (state.board[r][c] || pending.some((p) => p.row === r && p.col === c)) return;
    if (selectedRackIdx === null) {
      toast.message("Select a tile from your rack first");
      return;
    }
    const tile = rack[selectedRackIdx];
    setPending([...pending, { row: r, col: c, tile }]);
    setSelectedRackIdx(null);
  };

  const undo = () => setPending(pending.slice(0, -1));

  const submit = () => {
    const result = placeWord(state, myColor, pending);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPending([]);
    onAction(result.state, result.state.winner ? `${result.state.winner} wins` : null);
    toast.success(`+${result.score} for ${result.word.toUpperCase()}`);
  };

  const pass = () => {
    if (!isMyTurn) return;
    const next = passTurn(state, myColor);
    onAction(next, next.winner ? `${next.winner} wins` : null);
  };

  // Filter rack to those not used in pending
  const rackUsed: Record<number, boolean> = {};
  pending.forEach((p) => {
    const idx = rack.findIndex((t, i) => !rackUsed[i] && t.letter === p.tile.letter);
    if (idx !== -1) rackUsed[idx] = true;
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-px bg-border/40 p-px rounded-lg aspect-square" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {Array.from({ length: SIZE * SIZE }).map((_, idx) => {
          const r = Math.floor(idx / SIZE);
          const c = idx % SIZE;
          const tile = tileAt(r, c);
          const bonus = BONUSES[r][c];
          const isPending = pending.some((p) => p.row === r && p.col === c);
          const isCenter = r === 7 && c === 7;
          return (
            <button
              key={idx}
              onClick={() => placeAt(r, c)}
              className={`aspect-square grid place-items-center text-[8px] sm:text-[10px] font-bold ${
                tile
                  ? isPending
                    ? "bg-gold/30 text-foreground border border-gold"
                    : "bg-card text-foreground"
                  : bonus
                    ? bonusBg[bonus]
                    : isCenter
                      ? "bg-gold/20"
                      : "bg-card/40 hover:bg-card/70"
              }`}
            >
              {tile ? tile.letter : bonus ?? ""}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/60 p-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Your rack</span>
          <span>
            Host: <b className="text-gold">{state.scores.host}</b> · Joiner: <b className="text-silver">{state.scores.joiner}</b>
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {rack.map((t, i) => (
            <button
              key={i}
              disabled={rackUsed[i] || !isMyTurn}
              onClick={() => setSelectedRackIdx(i)}
              className={`h-9 w-9 rounded grid place-items-center font-bold text-sm border ${
                rackUsed[i]
                  ? "opacity-30 border-border"
                  : selectedRackIdx === i
                    ? "border-gold bg-gold/20"
                    : "border-border bg-card hover:border-gold/40"
              }`}
            >
              {t.letter}
              <span className="text-[7px] absolute mt-7 ml-5 text-muted-foreground">{t.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={submit}
          disabled={!isMyTurn || pending.length === 0 || disabled}
          className="flex-1 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground font-semibold disabled:opacity-40"
        >
          Play word
        </button>
        <button onClick={undo} disabled={pending.length === 0} className="px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-40">
          Undo
        </button>
        <button onClick={pass} disabled={!isMyTurn} className="px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-40">
          Pass
        </button>
      </div>

      <div className="rounded-lg bg-card/40 p-2 text-[11px] text-muted-foreground max-h-20 overflow-y-auto space-y-0.5">
        {state.log.slice(-5).map((l, i) => <div key={i}>· {l}</div>)}
      </div>
    </div>
  );
}
