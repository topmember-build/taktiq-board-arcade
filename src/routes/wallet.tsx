import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useBalance, useWalletClient, useSwitchChain, usePublicClient } from "wagmi";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet as WalletIcon,
  History,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Copy,
} from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";
import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { supabase } from "@/integrations/supabase/client";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/explorer";
import { ConfirmModal, type ConfirmModalState } from "@/components/ConfirmModal";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet - Deposit & Withdraw - TaQtik" },
      {
        name: "description",
        content:
          "Deposit and withdraw testnet tokens. All transfers settle on-chain and are publicly verifiable.",
      },
    ],
  }),
  component: WalletPage,
});

type Tx = {
  id: string;
  tx_type: string;
  amount: number;
  token_symbol: string;
  chain_id: number;
  tx_hash: string | null;
  status: string;
  created_at: string;
};

function WalletPage() {
  const { address, isConnected, chainId: connectedChain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [chainId, setChainId] = useState(SUPPORTED_CHAINS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmModalState | null>(null);
  const [history, setHistory] = useState<Tx[]>([]);

  // Load on-chain tx history
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .ilike("wallet_address", address.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(25);
      if (!cancelled && data) setHistory(data as Tx[]);
    };
    load();
    const channel = supabase
      .channel(`wallet-tx-${address}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [address]);

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

  const submitWithdraw = async () => {
    if (!walletClient || !address) {
      setConfirm({ status: "error", title: "Wallet not ready", message: "Reconnect your wallet and try again." });
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setConfirm({ status: "error", title: "Invalid amount", message: "Enter a withdrawal amount greater than zero." });
      return;
    }
    if (!destination.startsWith("0x") || destination.length !== 42) {
      setConfirm({ status: "error", title: "Invalid address", message: "Destination must be a valid 0x address." });
      return;
    }
    setSubmitting(true);
    setConfirm({ status: "pending", title: "Sending withdrawal…", message: "Confirm the transaction in your wallet." });
    try {
      if (connectedChain !== chainId) {
        await switchChainAsync({ chainId });
      }
      const hash = await walletClient.sendTransaction({
        to: destination as `0x${string}`,
        value: parseEther(amount),
      });
      // Log immediately
      await supabase.from("wallet_transactions").insert({
        wallet_address: address.toLowerCase(),
        profile_id: address.toLowerCase(),
        chain_id: chainId,
        tx_type: "withdraw",
        amount: amt,
        token_symbol: chain.symbol,
        tx_hash: hash,
        status: "pending",
      });
      setConfirm({
        status: "success",
        title: "Withdrawal broadcast",
        message: `Sent ${amt} ${chain.symbol} to ${destination.slice(0, 6)}…${destination.slice(-4)}.`,
        explorerUrl: explorerTxUrl(chainId, hash),
      });
      // Wait for confirmation in the background
      if (publicClient) {
        publicClient.waitForTransactionReceipt({ hash }).then(async (rcpt) => {
          await supabase
            .from("wallet_transactions")
            .insert({
              wallet_address: address.toLowerCase(),
              profile_id: address.toLowerCase(),
              chain_id: chainId,
              tx_type: "withdraw_confirmed",
              amount: amt,
              token_symbol: chain.symbol,
              tx_hash: rcpt.transactionHash,
              status: rcpt.status === "success" ? "confirmed" : "failed",
            });
        }).catch(() => {});
      }
      setAmount("");
    } catch (e: any) {
      setConfirm({
        status: "error",
        title: "Withdrawal failed",
        message: "The transaction was rejected or could not be sent.",
        detail: e?.shortMessage ?? e?.message,
        onRetry: () => submitWithdraw(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyDeposit = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">
          Manage your in-arcade balance across supported testnets. Every transfer is on-chain and
          publicly verifiable.
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
            {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "-"}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              onClick={() => setTab("deposit")}
              className={`p-3 rounded-lg border text-xs font-medium transition-smooth ${
                tab === "deposit" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4 mx-auto mb-1" /> Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`p-3 rounded-lg border text-xs font-medium transition-smooth ${
                tab === "withdraw" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4 mx-auto mb-1" /> Withdraw
            </button>
          </div>
        </div>

        {/* Form card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant space-y-5">
              <h2 className="text-xl font-semibold capitalize">{tab} funds</h2>

              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Network
                </label>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Built for <span className="text-gold font-semibold">Arc Testnet</span> · other testnets supported.
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_CHAINS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChainId(c.id)}
                      className={`relative px-3 py-2 rounded-lg border text-xs font-medium transition-smooth inline-flex items-center justify-center gap-1.5 ${
                        chainId === c.id
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-inner"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.short}
                      </span>
                      <span>{c.symbol}</span>
                      {c.primary && (
                        <span className="absolute -top-1 -right-1 text-[8px] uppercase tracking-widest px-1 py-px rounded-full bg-gradient-gold text-primary-foreground font-bold">
                          ★
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "deposit" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Send {chain.symbol} on <span className="font-medium text-foreground">{chain.name}</span>{" "}
                    to your connected wallet address below. Funds appear instantly after the network confirms.
                  </p>
                  <div className="rounded-lg border border-gold/30 bg-background/40 p-4 flex items-center gap-3">
                    <code className="flex-1 text-xs sm:text-sm font-mono break-all text-silver">{address}</code>
                    <button
                      onClick={copyDeposit}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:border-gold/40 text-xs"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <a
                    href={explorerAddressUrl(chainId, address!)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View address on explorer
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">
                      Destination address
                    </label>
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="0x…"
                      className="mt-2 w-full px-4 py-3 rounded-lg bg-input border border-border font-mono text-xs sm:text-sm focus:outline-none focus:border-gold/60"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Funds are sent on-chain and cannot be reversed. Double-check the address.
                    </p>
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
                      {[0.25, 0.5, 0.75, 1].map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            if (balance) setAmount((Number(balance.formatted) * p).toFixed(4));
                          }}
                          className="px-3 py-1 rounded text-xs border border-border text-muted-foreground hover:text-gold hover:border-gold/40"
                        >
                          {p === 1 ? "MAX" : `${p * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={submitWithdraw}
                    disabled={!amount || !destination || submitting}
                    className="w-full px-5 py-3.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Sending…" : `Withdraw ${amount || "0"} ${chain.symbol}`}
                  </button>
                </>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/60 pt-4">
                <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>
                  All transfers are signed by your wallet and broadcast directly to the network. Every
                  hash in your history below links to a public block explorer for independent verification.
                </span>
              </div>
            </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold">Recent transactions</h2>
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            No transactions yet. Make your first deposit or withdrawal to get started.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {history.map((tx) => {
              const ch = SUPPORTED_CHAINS.find((c) => c.id === tx.chain_id);
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize">
                      {tx.tx_type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()} · {ch?.name ?? `Chain ${tx.chain_id}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">
                      {tx.amount} {tx.token_symbol}
                    </div>
                    {tx.tx_hash ? (
                      <a
                        href={explorerTxUrl(tx.chain_id, tx.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-gold inline-flex items-center gap-1 hover:underline"
                      >
                        verify <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{tx.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
