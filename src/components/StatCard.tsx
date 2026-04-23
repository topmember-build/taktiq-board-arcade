import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "gold",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: "gold" | "silver" | "success";
}) {
  return (
    <div className="bg-gradient-card border border-border/60 rounded-xl p-5 shadow-elegant transition-smooth hover:border-gold/40 hover:shadow-gold">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <div
          className={cn(
            "h-9 w-9 rounded-lg grid place-items-center",
            accent === "gold" && "bg-gold/10 text-gold",
            accent === "silver" && "bg-silver/10 text-silver",
            accent === "success" && "bg-success/10 text-success",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
