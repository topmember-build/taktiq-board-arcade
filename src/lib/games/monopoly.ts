// Lightweight 2-player Monopoly engine — synchronous, deterministic state.
// Not the full Hasbro rulebook (no auctions, trades, mortgages, houses) —
// implements: roll dice, move, buy property, pay rent, jail, GO bonus,
// chance/community chest as simple cash deltas, bankruptcy = game over.

export type PropertyKind = "street" | "rail" | "utility" | "tax" | "go" | "jail" | "gojail" | "chance" | "chest" | "parking" | "free";

export type Space = {
  id: number;
  name: string;
  kind: PropertyKind;
  group?: string;
  price?: number;
  rent?: number; // simplified flat rent
  tax?: number;
};

export const BOARD: Space[] = [
  { id: 0, name: "GO", kind: "go" },
  { id: 1, name: "Mediterranean Ave", kind: "street", group: "brown", price: 60, rent: 6 },
  { id: 2, name: "Community Chest", kind: "chest" },
  { id: 3, name: "Baltic Ave", kind: "street", group: "brown", price: 60, rent: 8 },
  { id: 4, name: "Income Tax", kind: "tax", tax: 200 },
  { id: 5, name: "Reading RR", kind: "rail", price: 200, rent: 25 },
  { id: 6, name: "Oriental Ave", kind: "street", group: "lblue", price: 100, rent: 10 },
  { id: 7, name: "Chance", kind: "chance" },
  { id: 8, name: "Vermont Ave", kind: "street", group: "lblue", price: 100, rent: 10 },
  { id: 9, name: "Connecticut Ave", kind: "street", group: "lblue", price: 120, rent: 12 },
  { id: 10, name: "Jail / Just Visiting", kind: "jail" },
  { id: 11, name: "St. Charles Place", kind: "street", group: "pink", price: 140, rent: 14 },
  { id: 12, name: "Electric Co.", kind: "utility", price: 150, rent: 20 },
  { id: 13, name: "States Ave", kind: "street", group: "pink", price: 140, rent: 14 },
  { id: 14, name: "Virginia Ave", kind: "street", group: "pink", price: 160, rent: 16 },
  { id: 15, name: "Pennsylvania RR", kind: "rail", price: 200, rent: 25 },
  { id: 16, name: "St. James Place", kind: "street", group: "orange", price: 180, rent: 18 },
  { id: 17, name: "Community Chest", kind: "chest" },
  { id: 18, name: "Tennessee Ave", kind: "street", group: "orange", price: 180, rent: 18 },
  { id: 19, name: "New York Ave", kind: "street", group: "orange", price: 200, rent: 20 },
  { id: 20, name: "Free Parking", kind: "parking" },
  { id: 21, name: "Kentucky Ave", kind: "street", group: "red", price: 220, rent: 22 },
  { id: 22, name: "Chance", kind: "chance" },
  { id: 23, name: "Indiana Ave", kind: "street", group: "red", price: 220, rent: 22 },
  { id: 24, name: "Illinois Ave", kind: "street", group: "red", price: 240, rent: 24 },
  { id: 25, name: "B&O RR", kind: "rail", price: 200, rent: 25 },
  { id: 26, name: "Atlantic Ave", kind: "street", group: "yellow", price: 260, rent: 26 },
  { id: 27, name: "Ventnor Ave", kind: "street", group: "yellow", price: 260, rent: 26 },
  { id: 28, name: "Water Works", kind: "utility", price: 150, rent: 20 },
  { id: 29, name: "Marvin Gardens", kind: "street", group: "yellow", price: 280, rent: 28 },
  { id: 30, name: "Go to Jail", kind: "gojail" },
  { id: 31, name: "Pacific Ave", kind: "street", group: "green", price: 300, rent: 30 },
  { id: 32, name: "North Carolina Ave", kind: "street", group: "green", price: 300, rent: 30 },
  { id: 33, name: "Community Chest", kind: "chest" },
  { id: 34, name: "Pennsylvania Ave", kind: "street", group: "green", price: 320, rent: 32 },
  { id: 35, name: "Short Line", kind: "rail", price: 200, rent: 25 },
  { id: 36, name: "Chance", kind: "chance" },
  { id: 37, name: "Park Place", kind: "street", group: "dblue", price: 350, rent: 35 },
  { id: 38, name: "Luxury Tax", kind: "tax", tax: 100 },
  { id: 39, name: "Boardwalk", kind: "street", group: "dblue", price: 400, rent: 50 },
];

export type PlayerColor = "host" | "joiner";

export type MonopolyState = {
  pos: Record<PlayerColor, number>;
  cash: Record<PlayerColor, number>;
  jail: Record<PlayerColor, number>; // turns remaining
  owners: Record<number, PlayerColor | null>;
  toMove: PlayerColor;
  lastRoll: [number, number] | null;
  log: string[];
  awaitingDecision: { tile: number; price: number } | null; // buy prompt
  winner: PlayerColor | null;
};

export const initialMonopoly = (): MonopolyState => ({
  pos: { host: 0, joiner: 0 },
  cash: { host: 1500, joiner: 1500 },
  jail: { host: 0, joiner: 0 },
  owners: Object.fromEntries(BOARD.map((s) => [s.id, null])) as Record<number, PlayerColor | null>,
  toMove: "host",
  lastRoll: null,
  log: ["Game start. Host rolls first."],
  awaitingDecision: null,
  winner: null,
});

export const rollDice = (): [number, number] =>
  [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] as [number, number];

const opp = (p: PlayerColor): PlayerColor => (p === "host" ? "joiner" : "host");

export function rollAndMove(state: MonopolyState, player: PlayerColor): MonopolyState {
  if (state.winner || state.toMove !== player || state.awaitingDecision) return state;
  const next: MonopolyState = JSON.parse(JSON.stringify(state));
  if (next.jail[player] > 0) {
    next.jail[player] -= 1;
    next.log.push(`${player} stays in jail (${next.jail[player]} turns left).`);
    next.toMove = opp(player);
    return next;
  }
  const dice = rollDice();
  next.lastRoll = dice;
  const total = dice[0] + dice[1];
  const prev = next.pos[player];
  const dest = (prev + total) % 40;
  if (dest < prev) {
    next.cash[player] += 200;
    next.log.push(`${player} passed GO (+$200).`);
  }
  next.pos[player] = dest;
  const tile = BOARD[dest];
  next.log.push(`${player} rolled ${dice[0]}+${dice[1]} → ${tile.name}`);

  // Resolve tile
  if (tile.kind === "gojail") {
    next.pos[player] = 10;
    next.jail[player] = 2;
    next.log.push(`${player} was sent to jail.`);
  } else if (tile.kind === "tax" && tile.tax) {
    next.cash[player] -= tile.tax;
    next.log.push(`${player} paid $${tile.tax} tax.`);
  } else if (tile.kind === "chance" || tile.kind === "chest") {
    const delta = [50, 100, -50, -100, 200, 0, 75, -25][Math.floor(Math.random() * 8)];
    next.cash[player] += delta;
    next.log.push(
      delta >= 0 ? `${player} drew a card (+$${delta}).` : `${player} drew a card (-$${-delta}).`,
    );
  } else if ((tile.kind === "street" || tile.kind === "rail" || tile.kind === "utility")) {
    const owner = next.owners[dest];
    if (owner === null) {
      // prompt buy
      if (tile.price && next.cash[player] >= tile.price) {
        next.awaitingDecision = { tile: dest, price: tile.price };
        next.log.push(`${tile.name} is for sale at $${tile.price}.`);
        return next;
      }
    } else if (owner !== player && tile.rent) {
      next.cash[player] -= tile.rent;
      next.cash[owner] += tile.rent;
      next.log.push(`${player} paid $${tile.rent} rent to ${owner}.`);
    }
  }

  if (next.cash[player] < 0) {
    next.winner = opp(player);
    next.log.push(`${player} is bankrupt — ${next.winner} wins!`);
    return next;
  }
  next.toMove = opp(player);
  return next;
}

export function decideBuy(state: MonopolyState, player: PlayerColor, buy: boolean): MonopolyState {
  if (!state.awaitingDecision || state.toMove !== opp(player)) {
    // toMove already advanced? No — buy prompt happens before turn end
  }
  if (!state.awaitingDecision) return state;
  const next: MonopolyState = JSON.parse(JSON.stringify(state));
  const { tile, price } = next.awaitingDecision;
  if (buy && next.cash[player] >= price) {
    next.cash[player] -= price;
    next.owners[tile] = player;
    next.log.push(`${player} bought ${BOARD[tile].name} for $${price}.`);
  } else {
    next.log.push(`${player} declined to buy ${BOARD[tile].name}.`);
  }
  next.awaitingDecision = null;
  next.toMove = opp(player);
  return next;
}

export function gameResult(state: MonopolyState): "host" | "joiner" | null {
  return state.winner;
}
