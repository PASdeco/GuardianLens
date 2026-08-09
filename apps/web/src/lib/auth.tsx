"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { defineChain } from "viem";
import type { GuardianEthereumProvider } from "@guardian/genlayer";

type AuthValue = {
  ready: boolean;
  authenticated: boolean;
  walletAddress: string;
  mode: "privy" | "external" | "preview";
  login: () => void;
  logout: () => Promise<void>;
  connectExternal: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getEthereumProvider: () => Promise<GuardianEthereumProvider>;
};

const AuthContext = createContext<AuthValue | null>(null);
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() || "";
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() || "";
const STUDIONET_CHAIN_ID = 61999;
const STUDIONET_CHAIN_HEX = "0xf22f";

const studionet = defineChain({
  id: STUDIONET_CHAIN_ID,
  name: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"] } },
  blockExplorers: { default: { name: "GenLayer Explorer", url: "https://explorer-studio.genlayer.com" } }
});

async function ensureStudionetProvider(provider: GuardianEthereumProvider) {
  const currentChain = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (currentChain === STUDIONET_CHAIN_HEX) return provider;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET_CHAIN_HEX }] });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number((error as { code: unknown }).code) : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: STUDIONET_CHAIN_HEX,
        chainName: studionet.name,
        rpcUrls: studionet.rpcUrls.default.http,
        nativeCurrency: studionet.nativeCurrency,
        blockExplorerUrls: [studionet.blockExplorers.default.url]
      }]
    });
  }
  const selectedChain = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (selectedChain !== STUDIONET_CHAIN_HEX) {
    throw new Error("Your wallet did not switch to GenLayer Studionet. Switch to Studionet and try again.");
  }
  return provider;
}

function PreviewAuthProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState("");
  const connectExternal = useCallback(async () => {
    const provider = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!provider) throw new Error("No injected wallet was found.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = Array.isArray(accounts) ? String(accounts[0] || "") : "";
    if (!address) throw new Error("Wallet connection did not return an account.");
    const target = STUDIONET_CHAIN_HEX;
    const current = await provider.request({ method: "eth_chainId" }).catch(() => "");
    if (current !== target) {
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
      } catch {
        await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: target, chainName: studionet.name, rpcUrls: studionet.rpcUrls.default.http, nativeCurrency: studionet.nativeCurrency, blockExplorerUrls: [studionet.blockExplorers.default.url] }] });
      }
    }
    setWalletAddress(address);
  }, []);
  const value = useMemo<AuthValue>(() => ({
    ready: true,
    authenticated: Boolean(walletAddress),
    walletAddress,
    mode: walletAddress ? "external" : "preview",
    login: () => undefined,
    logout: async () => setWalletAddress(""),
    connectExternal,
    getAccessToken: async () => null,
    getEthereumProvider: async () => {
      const provider = (window as Window & { ethereum?: GuardianEthereumProvider }).ethereum;
      if (!provider) throw new Error("No injected wallet was found.");
      return ensureStudionetProvider(provider);
    }
  }), [connectExternal, walletAddress]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const embeddedAddress = user?.wallet?.address || "";
  const connectExternal = useCallback(async () => {
    login();
  }, [login]);
  const value = useMemo<AuthValue>(() => ({
    ready,
    authenticated,
    walletAddress: embeddedAddress,
    mode: "privy",
    login,
    logout,
    connectExternal,
    getAccessToken,
    getEthereumProvider: async () => {
      const wallet = wallets.find((candidate) => candidate.address.toLowerCase() === embeddedAddress.toLowerCase()) || wallets[0];
      if (!wallet) throw new Error("No Privy wallet is available for this account.");
      if (wallet.chainId !== `eip155:${STUDIONET_CHAIN_ID}`) {
        await wallet.switchChain(STUDIONET_CHAIN_ID);
      }
      const provider = await wallet.getEthereumProvider();
      return ensureStudionetProvider(provider);
    }
  }), [ready, authenticated, embeddedAddress, login, logout, connectExternal, getAccessToken, wallets]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function GuardianAuthProvider({ children }: { children: ReactNode }) {
  if (!appId) return <PreviewAuthProvider>{children}</PreviewAuthProvider>;
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId || undefined}
      config={{
        loginMethods: ["email", "google", "wallet"],
        supportedChains: [studionet],
        defaultChain: studionet,
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "light", accentColor: "#137b78", landingHeader: "Check before you trust" }
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

export function useGuardianAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useGuardianAuth must be used inside GuardianAuthProvider");
  return value;
}
