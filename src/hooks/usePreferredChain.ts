import { useEffect, useState, useCallback } from "react";
import { SUPPORTED_CHAINS, monadTestnet } from "@/lib/wagmi";

const STORAGE_KEY = "taqtik:preferred-chain";
const REMEMBER_KEY = "taqtik:remember-chain";
const DEFAULT_CHAIN_ID = monadTestnet.id;

function readStored(): number {
  if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
  try {
    const remember = localStorage.getItem(REMEMBER_KEY);
    if (remember === "false") return DEFAULT_CHAIN_ID;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHAIN_ID;
    const id = Number(raw);
    if (!SUPPORTED_CHAINS.some((c) => c.id === id)) return DEFAULT_CHAIN_ID;
    return id;
  } catch {
    return DEFAULT_CHAIN_ID;
  }
}

function readRemember(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * Persists the user's last selected chain across sessions.
 * Defaults to Monad Testnet. Honors the "remember chain" toggle.
 */
export function usePreferredChain() {
  const [chainId, setChainIdState] = useState<number>(DEFAULT_CHAIN_ID);
  const [remember, setRememberState] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChainIdState(readStored());
    setRememberState(readRemember());
    setHydrated(true);
  }, []);

  const setChainId = useCallback((id: number) => {
    setChainIdState(id);
    try {
      if (readRemember()) localStorage.setItem(STORAGE_KEY, String(id));
    } catch {}
  }, []);

  const setRemember = useCallback((value: boolean) => {
    setRememberState(value);
    try {
      localStorage.setItem(REMEMBER_KEY, value ? "true" : "false");
      if (!value) localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { chainId, setChainId, remember, setRemember, hydrated };
}

export const PREFERRED_CHAIN_DEFAULT = DEFAULT_CHAIN_ID;
