import { useEffect, useState } from "react";

const KEY = "taqtik:high-contrast";

export function useHighContrast() {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "1") setEnabled(true);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add("high-contrast");
    else root.classList.remove("high-contrast");
    try {
      localStorage.setItem(KEY, enabled ? "1" : "0");
    } catch {}
  }, [enabled]);

  return { enabled, toggle: () => setEnabled((v) => !v), setEnabled };
}
