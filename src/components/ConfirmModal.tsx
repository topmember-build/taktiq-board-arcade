import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ConfirmStatus = "success" | "error" | "pending" | null;

export type ConfirmModalState = {
  status: ConfirmStatus;
  title: string;
  message?: string;
  detail?: string;
  txHash?: string;
  explorerUrl?: string;
  onRetry?: () => void;
};

export function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmModalState | null;
  onClose: () => void;
}) {
  const open = !!state && !!state.status;
  const status = state?.status;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {status === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {status === "error" && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {status === "pending" && <Loader2 className="h-5 w-5 animate-spin text-gold" />}
            {state?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {state?.message && <p className="text-foreground/90">{state.message}</p>}
          {state?.detail && (
            <p className="text-xs text-muted-foreground break-words">{state.detail}</p>
          )}
          {state?.txHash && state?.explorerUrl && (
            <a
              href={state.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-gold hover:underline font-mono break-all"
            >
              {state.txHash.slice(0, 12)}…{state.txHash.slice(-8)}
            </a>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          {status === "error" && state?.onRetry && (
            <button
              onClick={state.onRetry}
              className="px-3 py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 inline-flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
          <button
            onClick={onClose}
            disabled={status === "pending"}
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {status === "pending" ? "Working…" : "Close"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
