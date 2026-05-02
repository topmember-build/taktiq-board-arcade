import { useAccount, useChainId } from "wagmi";
import { Activity, WifiOff } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/wagmi";

/**
 * HUD-style badge that surfaces the wallet's currently connected chain.
 * Renders a subtle disconnected pill when no wallet is attached.
 */
export function NetworkBadge({ className = "" }: { className?: string }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);

  if (!isConnected) {
    return (
      <div
        className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass border-white/10 text-[10px] uppercase tracking-widest text-muted-foreground ${className}`}
        title="No wallet connected"
      >
        <WifiOff className="h-3 w-3" /> Offline
      </div>
    );
  }

  const supported = !!chain;
  const color = chain?.color ?? "#9ca3af";
  const label = chain?.short ?? `0x${chainId.toString(16).toUpperCase()}`;
  const name = chain?.name ?? `Chain ${chainId}`;

  return (
    <div
      className={`hidden md:inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full glass border-white/10 text-[10px] uppercase tracking-widest font-semibold ${className}`}
      title={supported ? `Connected to ${name}` : `Unsupported network · ${name}`}
      aria-label={`Network ${name}`}
    >
      <span
        className="inline-flex h-5 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full text-[9px] text-white shadow-inner"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}66, inset 0 0 0 1px rgba(255,255,255,0.18)`,
        }}
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Activity className={`h-3 w-3 ${supported ? "text-success" : "text-destructive"}`} />
        {supported ? "Live" : "Wrong net"}
      </span>
    </div>
  );
}
