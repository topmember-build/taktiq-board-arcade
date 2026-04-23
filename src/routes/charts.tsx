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
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { title: "Live Charts — Monad & Testnet Markets — TaQtik" },
      {
        name: "description",
        content: "Live price charts for MON and other supported networks, refreshed every minute.",
      },
    ],
  }),
  component: ChartsPage,
});

type Token = { symbol: string; name: string; price: number; change: number; data: { t: number; v: number }[] };

function generateSeries(base: number) {
  const out = [];
  let v = base;
  for (let i = 0; i < 48; i++) {
    v += (Math.random() - 0.5) * base * 0.04;
    out.push({ t: i, v: Number(v.toFixed(4)) });
  }
  return out;
}

function ChartsPage() {
  const [tokens, setTokens] = useState<Token[]>([
    { symbol: "MON", name: "Monad", price: 0.0, change: 0, data: generateSeries(2.4) },
    { symbol: "ETH", name: "Ethereum", price: 0, change: 0, data: generateSeries(3200) },
    { symbol: "BNB", name: "BNB", price: 0, change: 0, data: generateSeries(580) },
  ]);
  const [active, setActive] = useState(0);
  const [updated, setUpdated] = useState(new Date());

  useEffect(() => {
    const refresh = () => {
      setTokens((prev) =>
        prev.map((t) => {
          const data = generateSeries(t.data[t.data.length - 1].v);
          const last = data[data.length - 1].v;
          const first = data[0].v;
          return { ...t, data, price: last, change: ((last - first) / first) * 100 };
        }),
      );
      setUpdated(new Date());
    };
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const current = tokens[active];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Live Charts</h1>
          <p className="text-muted-foreground mt-1">
            Track MON and supported network tokens in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" /> Updated {updated.toLocaleTimeString()}
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
                  t.change >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                }`}
              >
                {t.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {t.change.toFixed(2)}%
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold">${t.price.toFixed(t.price < 10 ? 4 : 2)}</div>
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={t.data}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={t.change >= 0 ? "oklch(0.72 0.16 145)" : "oklch(0.62 0.22 25)"}
                    strokeWidth={1.5}
                    dot={false}
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
            <h2 className="text-xl font-semibold">{current.name} ({current.symbol}/USD)</h2>
            <p className="text-xs text-muted-foreground">Last 48 intervals · Demo feed</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gradient-gold">${current.price.toFixed(4)}</div>
            <div className={`text-sm ${current.change >= 0 ? "text-success" : "text-destructive"}`}>
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
              <XAxis dataKey="t" stroke="oklch(0.55 0.015 260)" tick={{ fontSize: 11 }} />
              <YAxis stroke="oklch(0.55 0.015 260)" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Charts use a simulated feed for demo purposes. Plug in CoinGecko / DexScreener via a server function for production data.
      </p>
    </div>
  );
}
