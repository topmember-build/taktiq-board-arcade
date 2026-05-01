import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CHAINS, monadTestnet, arcTestnet } from "@/lib/wagmi";

const DESCRIPTIONS: Record<number, string> = {
  [monadTestnet.id]: "Recommended · ultra-fast EVM, native MON gas",
  [arcTestnet.id]: "Optional · USDC-native L1 from Circle",
  11155111: "Optional · Ethereum's primary testnet, ETH gas",
  84532: "Optional · Coinbase L2 testnet, ETH gas",
  421614: "Optional · Arbitrum L2 testnet, ETH gas",
  97: "Optional · BNB Chain testnet, tBNB gas",
};

export function NetworkDropdown({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (id: number) => void;
  className?: string;
}) {
  const selected = SUPPORTED_CHAINS.find((c) => c.id === value) ?? SUPPORTED_CHAINS[0];

  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger
        className={`h-auto py-2.5 bg-input/40 border-border hover:border-gold/40 transition-smooth ${className ?? ""}`}
      >
        <SelectValue>
          <div className="flex items-center gap-2 text-left">
            <span
              className="inline-flex h-5 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-inner"
              style={{ backgroundColor: selected.color }}
            >
              {selected.short}
            </span>
            <span className="font-medium">{selected.name}</span>
            {selected.primary && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-px rounded-full bg-gradient-gold text-primary-foreground font-bold">
                ★ Default
              </span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        {SUPPORTED_CHAINS.map((c) => (
          <SelectItem key={c.id} value={String(c.id)} className="py-2.5">
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 inline-flex h-5 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-inner shrink-0"
                style={{ backgroundColor: c.color }}
              >
                {c.short}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{c.name}</span>
                  {c.primary && (
                    <span className="text-[8px] uppercase tracking-widest px-1.5 py-px rounded-full bg-gradient-gold text-primary-foreground font-bold">
                      ★
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {DESCRIPTIONS[c.id] ?? `Optional testnet · ${c.symbol} gas`}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
