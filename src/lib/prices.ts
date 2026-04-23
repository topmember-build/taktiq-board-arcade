// Real price feed via CoinGecko's free public endpoint.
// MON has no listing yet on CoinGecko Free, so for MON we read live block height
// from the Monad RPC and derive a synthetic indicator while showing the latest
// on-chain block as the source of truth.

export type PricePoint = { t: number; v: number };
export type PriceSeries = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  data: PricePoint[];
};

const CG = "https://api.coingecko.com/api/v3";
const COIN_IDS: Record<string, string> = {
  ETH: "ethereum",
  BNB: "binancecoin",
};

export async function fetchSimplePrice(symbol: "ETH" | "BNB"): Promise<number> {
  const id = COIN_IDS[symbol];
  const res = await fetch(`${CG}/simple/price?ids=${id}&vs_currencies=usd`);
  if (!res.ok) throw new Error(`price ${res.status}`);
  const j = await res.json();
  return j[id]?.usd ?? 0;
}

export async function fetchHistory(symbol: "ETH" | "BNB"): Promise<PricePoint[]> {
  const id = COIN_IDS[symbol];
  const res = await fetch(`${CG}/coins/${id}/market_chart?vs_currency=usd&days=1`);
  if (!res.ok) throw new Error(`hist ${res.status}`);
  const j = (await res.json()) as { prices: [number, number][] };
  return j.prices.map(([t, v]) => ({ t, v }));
}

export async function fetchMonadIndicator(): Promise<{ block: number; series: PricePoint[] }> {
  const res = await fetch("https://testnet-rpc.monad.xyz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
  });
  const j = await res.json();
  const block = parseInt(j.result, 16);
  // Stable placeholder series until MON is listed
  const now = Date.now();
  const series: PricePoint[] = Array.from({ length: 24 }, (_, i) => ({
    t: now - (23 - i) * 3600_000,
    v: 1.0,
  }));
  return { block, series };
}
