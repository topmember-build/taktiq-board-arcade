import { Contrast } from "lucide-react";
import { useHighContrast } from "@/hooks/useHighContrast";

/**
 * Accessibility toggle: switches the app between the default holographic styling
 * and a high-contrast mode where badges and primary CTAs render with solid
 * black text on light backgrounds with strong borders for readability.
 */
export function HighContrastToggle({ className = "" }: { className?: string }) {
  const { enabled, toggle } = useHighContrast();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable high-contrast mode" : "Enable high-contrast mode"}
      title={enabled ? "High contrast: on" : "High contrast: off"}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-md border transition-smooth ${
        enabled
          ? "bg-foreground text-background border-foreground"
          : "border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/5"
      } ${className}`}
    >
      <Contrast className="h-4 w-4" />
    </button>
  );
}
