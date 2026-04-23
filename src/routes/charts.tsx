import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react";
import {
  fetchHistory,
  fetchMonadIndicator,
  fetchSimplePrice,
  type PricePoint,
} from "@/lib/prices";

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { title: "Live Charts — Monad & Testnet Markets — TaQtik" },
      {
        name: "description",
        content:
          "Live price charts for MON, ETH, and BNB powered by CoinGecko and the Monad testnet RPC.",
      },
    ],
  }),
  component: ChartsPage,
});

type Token = {
  symbol: "MON" | "ETH" | "BNB";
  name: string;
  price: number;
  change: number;
  data: PricePoint[];
  meta?: string;
};

function calcChange(data: PricePoint[]) {
  if (data.length < 2) return 0;
  const first = data[0].v;
  const last = data[data.length - 1].v;
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

function ChartsPage() {
  const [tokens, setTokens] = useState<Token[]>([
    { symbol: "MON", name: "Monad (testnet)", price: 0, change: 0, data: [] },
    { symbol: "ETH", name: "Ethereum", price: 0, change: 0, data: [] },
    { symbol: "BNB", name: "BNB", price: 0, change: 0, data: [] },
  ]);
  const [active, setActive] = useState(0);
  const [updated, setUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const [ethHist, bnbHist, ethPrice, bnbPrice, mon] = await Promise.all([
          fetchHistory("ETH").catch(() => [] as PricePoint[]),
          fetchHistory("BNB").catch(() => [] as PricePoint[]),
          fetchSimplePrice("ETH").catch(() => 0),
          fetchSimplePrice("BNB").catch(() => 0),
          fetchMonadIndicator().catch(() => ({ block: 0, series: [] as PricePoint[] })),
        ]);
        if (!mounted) return;
        setTokens([
          {
            symbol: "MON",
            name: "Monad (testnet)",
            price: 1.0,
            change: 0,
            data: mon.series,
            meta: mon.block ? `Block #${mon.block.toLocaleString()}` : "Live RPC",
          },
          {
            symbol: "ETH",
            name: "Ethereum",
            price: ethPrice,
            change: calcChange(ethHist),
            data: ethHist,
          },
          {
            symbol: "BNB",
            name: "BNB",
            price: bnbPrice,
            change: calcChange(bnbHist),
            data: bnbHist,
          },
        ]);
        setUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const current = tokens[active];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Live Charts</h1>
          <p className="text-muted-foreground mt-1">
            CoinGecko prices for ETH and BNB · Monad testnet RPC for MON.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" suppressHydrationWarning>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />{" "}
          {updated ? `Updated ${updated}` : "Loading…"}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {tokens.map((t, i) => (
          <button
            key={t.symbol}
            onClick={() => setActive(i)}
            className={`text-left rounded-2xl border p-5 transition-smooth bg-gradient-card ${
              active === i ? "border-gold shadow-gold" : "border-border/60 hover:border-gold/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t.symbol}</div>
                <div className="text-xs text-muted-foreground">{t.name}</div>
              </div>
              <div
                className={`text-xs font-medium px-2 py-1 rounded inline-flex items-center gap-1 ${
                  t.change >= 0
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10"
                }`}
              >
                {t.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {t.change.toFixed(2)}%
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold">
              {t.price > 0 ? `$${t.price.toFixed(t.price < 10 ? 4 : 2)}` : "—"}
            </div>
            {t.meta && (
              <div className="mt-1 text-[11px] text-silver flex items-center gap-1">
                <Activity className="h-3 w-3" /> {t.meta}
              </div>
            )}
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={t.data}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={t.change >= 0 ? "oklch(0.72 0.16 145)" : "oklch(0.62 0.22 25)"}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              {current.name} ({current.symbol}/USD)
            </h2>
            <p className="text-xs text-muted-foreground">
              {current.symbol === "MON"
                ? "Live block from testnet-rpc.monad.xyz"
                : "Last 24h · CoinGecko free tier"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gradient-gold">
              {current.price > 0 ? `$${current.price.toFixed(4)}` : "—"}
            </div>
            <div
              className={`text-sm ${current.change >= 0 ? "text-success" : "text-destructive"}`}
            >
              {current.change >= 0 ? "▲" : "▼"} {Math.abs(current.change).toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={current.data}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.16 88)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.82 0.16 88)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                stroke="oklch(0.55 0.015 260)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  typeof v === "number" && v > 1_000_000_000
                    ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : String(v)
                }
              />
              <YAxis
                stroke="oklch(0.55 0.015 260)"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.17 0.014 260)",
                  border: "1px solid oklch(0.82 0.16 88 / 0.4)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="oklch(0.82 0.16 88)"
                strokeWidth={2}
                fill="url(#goldFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ETH/BNB prices: CoinGecko public API · MON: Monad Testnet RPC. MON USD pricing will be
        wired in once a public oracle ships for testnet.
      </p>
    </div>
  );
}
