import { useEffect, useMemo, useState } from "react";
import { useAccount, useSwitchChain, useWalletClient, usePublicClient } from "wagmi";
import { ArrowRightLeft, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import {
  CCTP_CHAINS,
  buildApproveCalldata,
  buildDepositForBurnCalldata,
  buildReceiveMessageCalldata,
  fetchAttestation,
  findCctpChain,
  type CctpChain,
} from "@/lib/cctp";
import {
  findSwapRoute,
  buildExactInputSingleCalldata,
  buildBalanceOfCalldata,
} from "@/lib/swap";
import { explorerTxUrl } from "@/lib/explorer";
import { parseUnits, parseEther, decodeAbiParameters } from "viem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step =
  | "idle"
  | "swapping"
  | "approving"
  | "burning"
  | "waiting-attestation"
  | "minting"
  | "done"
  | "error";

type SourceToken = "USDC" | "ETH";

export function CctpBridge() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [sourceToken, setSourceToken] = useState<SourceToken>("USDC");
  const [from, setFrom] = useState<CctpChain>(CCTP_CHAINS[0]);
  const [to, setTo] = useState<CctpChain>(CCTP_CHAINS[1]);
  const [amount, setAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [swapHash, setSwapHash] = useState<string | null>(null);
  const [burnHash, setBurnHash] = useState<string | null>(null);
  const [mintHash, setMintHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  const targets = useMemo(() => CCTP_CHAINS.filter((c) => c.chainId !== from.chainId), [from]);
  useEffect(() => {
    if (to.chainId === from.chainId) setTo(targets[0]);
  }, [from, to, targets]);

  const reset = () => {
    setStep("idle");
    setSwapHash(null);
    setBurnHash(null);
    setMintHash(null);
    setError(null);
  };

  const bridge = async () => {
    if (!isConnected || !address || !walletClient) {
      toast.error("Connect your wallet first");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(`Enter a valid ${sourceToken} amount`);
      return;
    }
    if (!recipient.startsWith("0x") || recipient.length !== 42) {
      toast.error("Enter a valid destination address");
      return;
    }
    reset();
    try {
      // Switch to source chain
      if (chainId !== from.chainId) {
        await switchChainAsync({ chainId: from.chainId });
      }

      let value: bigint; // USDC amount (6 decimals) that will be burned

      // 0. Optional ETH → USDC swap on the source chain via Uniswap V3.
      if (sourceToken === "ETH") {
        const route = findSwapRoute(from.chainId);
        if (!route) throw new Error(`ETH→USDC swap is not available on ${from.name} yet.`);
        if (!publicClient) throw new Error("Public RPC client not ready");
        setStep("swapping");

        const ethIn = parseEther(amount);
        // Snapshot USDC balance so we can measure the swap output precisely.
        const balBefore = (await publicClient.call({
          to: route.usdc,
          data: buildBalanceOfCalldata(address),
        })).data;
        const before = balBefore
          ? (decodeAbiParameters([{ type: "uint256" }], balBefore)[0] as bigint)
          : 0n;

        const swap = await walletClient.sendTransaction({
          to: route.swapRouter,
          data: buildExactInputSingleCalldata({
            tokenIn: route.weth,
            tokenOut: route.usdc,
            fee: route.feeTier,
            recipient: address,
            amountIn: ethIn,
            amountOutMinimum: 0n, // testnet — accept any quote; UI surfaces final amount
          }),
          value: ethIn,
        });
        setSwapHash(swap);
        await publicClient.waitForTransactionReceipt({ hash: swap });

        const balAfter = (await publicClient.call({
          to: route.usdc,
          data: buildBalanceOfCalldata(address),
        })).data;
        const after = balAfter
          ? (decodeAbiParameters([{ type: "uint256" }], balAfter)[0] as bigint)
          : 0n;
        value = after - before;
        if (value <= 0n) throw new Error("Swap returned 0 USDC. The pool may be illiquid on this testnet.");

        await supabase.from("wallet_transactions").insert({
          wallet_address: address.toLowerCase(),
          profile_id: address.toLowerCase(),
          chain_id: from.chainId,
          tx_type: "swap_eth_usdc",
          amount: amt,
          token_symbol: "ETH",
          tx_hash: swap,
          status: "confirmed",
        });
      } else {
        value = parseUnits(amount, 6); // USDC = 6 decimals
      }

      const maxFee = (value * 5n) / 10000n; // 5 bps cap (testnet)

      // 1. Approve
      setStep("approving");
      const approveHash = await walletClient.sendTransaction({
        to: from.usdc,
        data: buildApproveCalldata(from.tokenMessenger, value),
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2. depositForBurn
      setStep("burning");
      const burn = await walletClient.sendTransaction({
        to: from.tokenMessenger,
        data: buildDepositForBurnCalldata({
          amount: value,
          destinationDomain: to.domain,
          mintRecipient: recipient as `0x${string}`,
          burnToken: from.usdc,
          maxFee,
        }),
      });
      setBurnHash(burn);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: burn });

      // Log burn tx
      await supabase.from("wallet_transactions").insert({
        wallet_address: address.toLowerCase(),
        profile_id: address.toLowerCase(),
        chain_id: from.chainId,
        tx_type: "bridge_burn",
        amount: amt,
        token_symbol: "USDC",
        tx_hash: burn,
        status: "confirmed",
      });

      // 3. Poll attestation
      setStep("waiting-attestation");
      let attestation: Awaited<ReturnType<typeof fetchAttestation>> = null;
      for (let i = 0; i < 60; i++) {
        attestation = await fetchAttestation(from.domain, burn);
        if (attestation) break;
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!attestation) throw new Error("Timed out waiting for Circle attestation. Try again from the same burn tx in a few minutes.");

      // 4. Switch to dest chain & mint
      await switchChainAsync({ chainId: to.chainId });
      setStep("minting");
      const mint = await walletClient.sendTransaction({
        to: to.messageTransmitter,
        data: buildReceiveMessageCalldata(attestation.message, attestation.attestation),
      });
      setMintHash(mint);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: mint });

      await supabase.from("wallet_transactions").insert({
        wallet_address: address.toLowerCase(),
        profile_id: address.toLowerCase(),
        chain_id: to.chainId,
        tx_type: "bridge_mint",
        amount: amt,
        token_symbol: "USDC",
        tx_hash: mint,
        status: "confirmed",
      });

      setStep("done");
      toast.success(`Bridged ${amt} USDC to ${to.name}`);
    } catch (e: any) {
      setStep("error");
      setError(e?.shortMessage ?? e?.message ?? "Bridge failed");
    }
  };

  const stepLabel: Record<Step, string> = {
    idle: sourceToken === "ETH" ? "Swap ETH & bridge to USDC" : "Bridge USDC",
    swapping: "Swapping ETH → USDC…",
    approving: "Approving USDC…",
    burning: "Burning on source…",
    "waiting-attestation": "Waiting for Circle attestation…",
    minting: "Minting on destination…",
    done: "Bridge complete ✓",
    error: "Retry bridge",
  };

  const busy = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant space-y-5">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-gold" />
        <h2 className="text-xl font-semibold">Cross-chain Bridge</h2>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          Powered by Circle CCTP
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Move native USDC between testnets using Circle&apos;s official CCTP v2 contracts. Pay in
        USDC, or pay in ETH and we&apos;ll swap to USDC on the source chain via Uniswap V3 first.
      </p>

      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Source token
        </label>
        <div className="mt-2 inline-flex rounded-lg border border-border bg-input p-1 text-sm">
          {(["USDC", "ETH"] as SourceToken[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSourceToken(t)}
              className={`px-4 py-1.5 rounded-md font-medium transition-smooth ${
                sourceToken === t
                  ? "bg-gradient-gold text-primary-foreground shadow-gold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {sourceToken === "ETH" && !findSwapRoute(from.chainId) && (
          <p className="mt-2 text-[11px] text-destructive">
            ETH→USDC swap is not configured on {from.name}. Pick another source chain.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">From</label>
          <select
            value={from.chainId}
            onChange={(e) => setFrom(findCctpChain(Number(e.target.value))!)}
            className="mt-2 w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:outline-none focus:border-gold/60"
          >
            {CCTP_CHAINS.map((c) => (
              <option key={c.chainId} value={c.chainId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">To</label>
          <select
            value={to.chainId}
            onChange={(e) => setTo(findCctpChain(Number(e.target.value))!)}
            className="mt-2 w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:outline-none focus:border-gold/60"
          >
            {targets.map((c) => (
              <option key={c.chainId} value={c.chainId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Amount ({sourceToken})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step={sourceToken === "ETH" ? "0.001" : "1"}
          className="mt-2 w-full px-3 py-2.5 rounded-lg bg-input border border-border text-lg font-semibold focus:outline-none focus:border-gold/60"
        />
        {sourceToken === "ETH" && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            We&apos;ll swap your ETH to USDC on {from.name} (Uniswap V3, 0.05% pool) and bridge the
            received USDC to {to.name}.
          </p>
        )}
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Destination address
        </label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x…"
          className="mt-2 w-full px-3 py-2.5 rounded-lg bg-input border border-border font-mono text-xs focus:outline-none focus:border-gold/60"
        />
      </div>

      <button
        onClick={bridge}
        disabled={!isConnected || busy}
        className="w-full px-5 py-3.5 rounded-lg bg-gradient-gold text-primary-foreground font-semibold shadow-gold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {stepLabel[step]}
      </button>

      {(swapHash || burnHash || mintHash || error) && (
        <div className="text-xs space-y-1.5 border-t border-border/60 pt-4">
          {swapHash && (
            <a
              href={explorerTxUrl(from.chainId, swapHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-silver hover:text-gold"
            >
              <ExternalLink className="h-3 w-3" /> Swap tx on {from.name}
            </a>
          )}
          {burnHash && (
            <a
              href={explorerTxUrl(from.chainId, burnHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-silver hover:text-gold"
            >
              <ExternalLink className="h-3 w-3" /> Burn tx on {from.name}
            </a>
          )}
          {mintHash && (
            <a
              href={explorerTxUrl(to.chainId, mintHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-silver hover:text-gold"
            >
              <ExternalLink className="h-3 w-3" /> Mint tx on {to.name}
            </a>
          )}
          {error && <p className="text-destructive">{error}</p>}
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border/60 pt-4">
        <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
        <span>
          CCTP burns USDC on the source chain and mints fresh USDC on the destination using
          Circle&apos;s attestation network. Attestation usually completes in 1-2 minutes on
          testnet.
        </span>
      </div>
    </div>
  );
}
