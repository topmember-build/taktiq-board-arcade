import { useAccount, useSwitchChain } from "wagmi";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS, monadTestnet } from "@/lib/wagmi";
import { useState } from "react";

/**
 * Banner that detects the wallet's connected chain and warns if it isn't a
 * supported testnet. Encourages switching to Monad Testnet by default.
 */
export function NetworkGuard({ preferredChainId }: { preferredChainId?: number }) {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [busy, setBusy] = useState(false);

  if (!isConnected || !chainId) return null;

  const supported = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const target =
    SUPPORTED_CHAINS.find((c) => c.id === (preferredChainId ?? monadTestnet.id)) ??
    SUPPORTED_CHAINS[0];

  if (supported) return null;

  const handleSwitch = async () => {
    setBusy(true);
    try {
      await switchChainAsync({ chainId: target.id });
    } catch {
      /* user rejected */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-destructive">Unsupported network</div>
        <div className="text-xs text-muted-foreground mt-1">
          Your wallet is on chain <span className="font-mono">#{chainId}</span>, which TaQtik
          doesn't support. Switch to <span className="text-gold font-semibold">{target.name}</span>{" "}
          (recommended) or any other supported testnet to continue.
        </div>
      </div>
      <button
        onClick={handleSwitch}
        disabled={busy || isPending}
        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-gold text-primary-foreground text-xs font-semibold shadow-gold disabled:opacity-50"
      >
        {(busy || isPending) && <Loader2 className="h-3 w-3 animate-spin" />}
        Switch to {target.short}
      </button>
    </div>
  );
}
