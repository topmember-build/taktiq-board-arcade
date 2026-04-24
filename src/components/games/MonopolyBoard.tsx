import { useState } from "react";
import { BOARD, decideBuy, rollAndMove, type MonopolyState, type PlayerColor } from "@/lib/games/monopoly";
import { Dice5, DollarSign } from "lucide-react";

const groupColor: Record<string, string> = {
  brown: "#8b5a2b", lblue: "#9ad7ea", pink: "#d83a8a", orange: "#ed8c2c",
  red: "#d92929", yellow: "#e7d332", green: "#3aa55c", dblue: "#1f4ea1",
};

export function MonopolyBoard({
  state,
  myColor,
  disabled,
  onAction,
}: {
  state: MonopolyState;
  myColor: PlayerColor;
  disabled: boolean;
  onAction: (next: MonopolyState, result: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isMyTurn = state.toMove === myColor && !state.winner;

  const tilePos = (i: number): [number, number] => {
    // 11x11 grid; bottom row, left col, top row, right col
    if (i <= 10) return [10, 10 - i];
    if (i <= 20) return [10 - (i - 10), 0];
    if (i <= 30) return [0, i - 20];
    return [i - 30, 10];
  };

  const roll = () => {
    if (!isMyTurn || busy) return;
    setBusy(true);
    const next = rollAndMove(state, myColor);
    onAction(next, next.winner ? `${next.winner} wins` : null);
    setBusy(false);
  };

  const buy = (yes: boolean) => {
    if (busy) return;
    setBusy(true);
    const next = decideBuy(state, myColor, yes);
    onAction(next, next.winner ? `${next.winner} wins` : null);
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-11 grid-rows-11 gap-px bg-border/40 p-px rounded-lg aspect-square text-[8px] sm:text-[10px]">
        {Array.from({ length: 121 }).map((_, idx) => {
          const r = Math.floor(idx / 11);
          const c = idx % 11;
          const isEdge = r === 0 || r === 10 || c === 0 || c === 10;
          if (!isEdge) {
            if (r === 5 && c === 5)
              return (
                <div key={idx} className="col-span-9 row-span-9 -mt-[40%] -ml-[40%] grid place-items-center bg-card/40 rounded">
                  <div className="text-center">
                    <div className="text-gold font-bold text-base sm:text-lg">TaQtik · Monopoly</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Turn: {state.toMove}</div>
                    {state.lastRoll && (
                      <div className="text-[10px] mt-1">🎲 {state.lastRoll[0]} + {state.lastRoll[1]}</div>
                    )}
                  </div>
                </div>
              );
            return null;
          }
          // Map edge cell to tile id
          let id = -1;
          if (r === 10) id = 10 - c;
          else if (c === 0) id = 10 + (10 - r);
          else if (r === 0) id = 20 + c;
          else if (c === 10) id = 30 + r;
          if (id < 0 || id > 39) return <div key={idx} className="bg-card/30" />;
          const tile = BOARD[id];
          const owner = state.owners[id];
          const hostHere = state.pos.host === id;
          const joinerHere = state.pos.joiner === id;
          return (
            <div
              key={idx}
              className="bg-card/60 p-0.5 flex flex-col justify-between relative overflow-hidden"
              title={tile.name}
            >
              {tile.group && (
                <div className="h-1.5 -mx-0.5 -mt-0.5" style={{ background: groupColor[tile.group] }} />
              )}
              <div className="leading-tight truncate">{tile.name}</div>
              {tile.price && <div className="text-[7px] text-muted-foreground">${tile.price}</div>}
              {owner && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ background: owner === "host" ? "var(--gold)" : "var(--silver)" }}
                />
              )}
              <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
                {hostHere && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                {joinerHere && <span className="h-1.5 w-1.5 rounded-full bg-silver" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-gold/30 p-2">
          <div className="text-gold font-semibold">Host {state.toMove === "host" && "•"}</div>
          <div className="flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3" />{state.cash.host}</div>
          <div className="text-muted-foreground">@{BOARD[state.pos.host].name}</div>
        </div>
        <div className="rounded-lg border border-silver/30 p-2">
          <div className="text-silver font-semibold">Joiner {state.toMove === "joiner" && "•"}</div>
          <div className="flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3" />{state.cash.joiner}</div>
          <div className="text-muted-foreground">@{BOARD[state.pos.joiner].name}</div>
        </div>
      </div>

      {state.awaitingDecision && state.toMove === myColor ? (
        <div className="rounded-lg border border-gold/40 p-3 bg-gold/5 flex items-center gap-2">
          <span className="text-sm flex-1">
            Buy <b>{BOARD[state.awaitingDecision.tile].name}</b> for ${state.awaitingDecision.price}?
          </span>
          <button onClick={() => buy(true)} className="px-3 py-1.5 rounded bg-gradient-gold text-primary-foreground text-xs font-semibold">Buy</button>
          <button onClick={() => buy(false)} className="px-3 py-1.5 rounded border border-border text-xs">Pass</button>
        </div>
      ) : (
        <button
          onClick={roll}
          disabled={!isMyTurn || disabled || busy}
          className="w-full px-4 py-2.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Dice5 className="h-4 w-4" />
          {isMyTurn ? "Roll dice" : `Waiting for ${state.toMove}…`}
        </button>
      )}

      <div className="rounded-lg bg-card/40 p-2 text-[11px] text-muted-foreground max-h-24 overflow-y-auto space-y-0.5">
        {state.log.slice(-6).map((l, i) => <div key={i}>· {l}</div>)}
      </div>
    </div>
  );
}
