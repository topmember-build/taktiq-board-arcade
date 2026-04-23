import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useBalance } from "wagmi";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, History, ShieldCheck } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { useState } from "react";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Deposit & Withdraw — TaQtik" },
      {
        name: "description",
        content: "Deposit MON or testnet tokens to bet on board games. Withdraw your winnings anytime.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [chainId, setChainId] = useState(SUPPORTED_CHAINS[0].id);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <WalletIcon className="h-12 w-12 mx-auto text-gold" />
        <h1 className="text-2xl font-bold">Connect your wallet</h1>
        <p className="text-sm text-muted-foreground">
          Your wallet is your TaQtik account. Connect it to deposit, withdraw, and play.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold"
        >
          Go to home
        </Link>
      </div>
    );
  }

  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">
          Manage your in-arcade balance across supported testnets.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Balance card */}
        <div className="lg:col-span-1 rounded-2xl border border-gold/30 bg-gradient-card p-6 shadow-gold">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Connected</div>
          <div className="mt-2 text-sm font-mono break-all text-silver">{address}</div>
          <div className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
            Native balance
          </div>
          <div className="mt-1 text-3xl font-bold text-gradient-gold">
            {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "—"}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setTab("deposit")}
              className={`p-3 rounded-lg border text-sm font-medium transition-smooth ${
                tab === "deposit"
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4 mx-auto mb-1" /> Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`p-3 rounded-lg border text-sm font-medium transition-smooth ${
                tab === "withdraw"
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4 mx-auto mb-1" /> Withdraw
            </button>
          </div>
        </div>

        {/* Form card */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant space-y-5">
          <h2 className="text-xl font-semibold capitalize">{tab} funds</h2>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Network
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SUPPORTED_CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChainId(c.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-smooth ${
                    chainId === c.id
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:border-gold/40"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1.5"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Amount ({chain.symbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-2 w-full px-4 py-3 rounded-lg bg-input border border-border text-lg font-semibold focus:outline-none focus:border-gold/60"
            />
            <div className="mt-2 flex gap-2">
              {["25%", "50%", "75%", "MAX"].map((p) => (
                <button
                  key={p}
                  className="px-3 py-1 rounded text-xs border border-border text-muted-foreground hover:text-gold hover:border-gold/40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!amount}
            className="w-full px-5 py-3.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tab === "deposit" ? "Deposit" : "Withdraw"} {amount || "0"} {chain.symbol}
          </button>

          <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/60 pt-4">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>
              All deposits and withdrawals are settled on-chain by the TaQtik vault contract. Gas
              fees apply on the selected network.
            </span>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold">Recent transactions</h2>
        </div>
        <div className="text-sm text-muted-foreground text-center py-10">
          No transactions yet. Make your first deposit to get started.
        </div>
      </div>
    </div>
  );
}
