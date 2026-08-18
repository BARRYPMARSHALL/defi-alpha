import { useCallback, useEffect, useState } from "react";

/**
 * Minimal MetaMask (EIP-1193 injected provider) wallet connect.
 * Deliberately dependency-free: we only need the address to deep-link into
 * DeBank/Zerion for position view. Full on-chain position indexing lives
 * behind DEBANK_API_KEY (see server) — the connect itself needs no key.
 */
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  available: boolean; // MetaMask (or other injected wallet) present
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE_KEY = "defiAlphaWalletAddress";

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = window.ethereum;
    if (eth) {
      setAvailable(true);
      // Restore previous session's address (best-effort; no account fetch
      // without user gesture beyond what the provider allows)
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);

      const onAccountsChanged = (accounts: unknown) => {
        const list = Array.isArray(accounts) ? accounts : [];
        const next = typeof list[0] === "string" ? list[0] : null;
        setAddress(next);
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
      };
      eth.on?.("accountsChanged", onAccountsChanged);
      return () => eth.removeListener?.("accountsChanged", onAccountsChanged);
    }
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setConnecting(true);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const next = accounts[0] || null;
      setAddress(next);
      if (next) localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      console.warn("Wallet connect rejected:", e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    address,
    connected: !!address,
    available,
    connecting,
    connect,
    disconnect,
  };
}

/** DeBank profile deep-link — free, no API key needed for the human view. */
export function debankProfileUrl(address: string): string {
  return `https://debank.com/profile/${address}`;
}

/** Zerion profile deep-link (fallback view). */
export function zerionProfileUrl(address: string): string {
  return `https://app.zerion.io/${address}`;
}
