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
    <div className="holo-border glass rounded-2xl p-5 transition-smooth hover:shadow-gold hover:-translate-y-0.5 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        <div
          className={cn(
            "h-9 w-9 rounded-xl grid place-items-center backdrop-blur-md ring-1",
            accent === "gold" && "bg-gold/15 text-gold ring-gold/30",
            accent === "silver" && "bg-silver/15 text-silver ring-silver/30",
            accent === "success" && "bg-success/15 text-success ring-success/30",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-gradient-silver">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
