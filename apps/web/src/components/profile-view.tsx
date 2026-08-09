"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Bookmark,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  LogIn,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  WalletCards
} from "lucide-react";
import { ACCESS_PRICE_GEN } from "@guardian/shared";
import {
  createGuardianWalletClient,
  readAccess,
  submitAccessPayment,
  waitForSuccessfulReceipt
} from "@guardian/genlayer";
import { useGuardianAuth } from "@/lib/auth";
import { useGuardianStore } from "@/lib/store";
import { useGuardianTheme } from "@/lib/theme";

export function ProfileView() {
  const auth = useGuardianAuth();
  const { scans, watchlist } = useGuardianStore();
  const { theme, setTheme } = useGuardianTheme();
  const [recallAlerts, setRecallAlerts] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [message, setMessage] = useState("");
  const [accessActive, setAccessActive] = useState(false);
  const [accessChecking, setAccessChecking] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const accessPassAddress = process.env.NEXT_PUBLIC_ACCESS_PASS_ADDRESS || "";
  const accessConfigured = Boolean(accessPassAddress);
  const wallet = auth.walletAddress ? `${auth.walletAddress.slice(0, 8)}...${auth.walletAddress.slice(-6)}` : "No wallet connected";
  const finalized = scans.filter((scan) => scan.status === "FINALIZED").length;

  useEffect(() => {
    let cancelled = false;
    if (!auth.walletAddress || !accessPassAddress) {
      setAccessActive(false);
      return;
    }
    setAccessChecking(true);
    void readAccess(auth.walletAddress, accessPassAddress)
      .then((active) => {
        if (!cancelled) setAccessActive(active);
      })
      .catch(() => {
        if (!cancelled) setAccessActive(false);
      })
      .finally(() => {
        if (!cancelled) setAccessChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.walletAddress, accessPassAddress]);

  function connectAccount() {
    setMessage("");
    if (auth.mode === "preview") {
      void auth.connectExternal().catch((error: Error) => setMessage(error.message));
      return;
    }
    auth.login();
  }

  async function activateAccess() {
    if (!auth.authenticated) {
      connectAccount();
      return;
    }
    if (!accessConfigured) {
      setMessage("Access activation will become available when the Guardian Lens testnet launch is connected.");
      return;
    }
    if (accessActive) {
      setMessage("Guardian Lens access is already active for this wallet.");
      return;
    }
    setPaymentPending(true);
    setMessage("Confirm the one-time 20 test GEN payment in your wallet.");
    try {
      const provider = await auth.getEthereumProvider();
      const client = createGuardianWalletClient(auth.walletAddress, provider);
      const hash = await submitAccessPayment(client, accessPassAddress);
      setMessage("Payment submitted. Waiting for GenLayer validators to accept it…");
      await waitForSuccessfulReceipt(client, hash);
      let active = false;
      for (let attempt = 0; attempt < 24 && !active; attempt += 1) {
        active = await readAccess(auth.walletAddress, accessPassAddress);
        if (!active) {
          setMessage("Payment accepted. Waiting for the access entitlement to finalize on GenLayer…");
          await new Promise((resolve) => window.setTimeout(resolve, 5000));
        }
      }
      setAccessActive(active);
      setMessage(active ? "Guardian Lens access is active. Sponsored testnet scans are now available." : "Payment is still finalizing on GenLayer. Keep this page open and try your scan once it shows Access active.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The access payment could not be completed.");
    } finally {
      setPaymentPending(false);
    }
  }

  return (
    <section className="content-page profile-page">
      <header className="profile-hero">
        <div className="profile-avatar"><CircleUserRound /></div>
        <div className="profile-identity">
          <span className="eyebrow">Your account</span>
          <h1>{auth.authenticated ? "Guardian member" : "Welcome to Guardian Lens"}</h1>
          <p>{auth.authenticated ? wallet : "Connect your preferred wallet to keep your access and assessments together."}</p>
        </div>
        <span className={`account-state ${auth.authenticated ? "connected" : ""}`}><span /> {auth.authenticated ? "Connected" : "Guest mode"}</span>
      </header>

      <section className="profile-stats" aria-label="Account activity">
        <div><span className="profile-stat-icon"><Clock3 /></span><span><strong>{scans.length}</strong><small>Product checks</small></span></div>
        <div><span className="profile-stat-icon"><Bookmark /></span><span><strong>{watchlist.length}</strong><small>Watched products</small></span></div>
        <div><span className="profile-stat-icon"><ShieldCheck /></span><span><strong>{finalized}</strong><small>Finalized reports</small></span></div>
      </section>

      <div className="profile-layout">
        <div className="profile-primary">
          <section className="profile-card account-card">
            <div className="profile-card-heading"><div><span className="eyebrow">Account</span><h2>Sign-in and wallet</h2></div><WalletCards /></div>
            <div className="account-row">
              <span className="account-row-icon"><WalletCards /></span>
              <span><strong>{wallet}</strong><small>{auth.authenticated ? "Used for Guardian Lens access and reports" : "Connect securely with Privy or your browser wallet"}</small></span>
              {auth.authenticated ? <span className="verified-mark"><Check /> Verified</span> : <button type="button" className="text-button" onClick={connectAccount}>Connect</button>}
            </div>
            {!auth.authenticated ? (
              <button className="primary-button profile-main-action" type="button" onClick={connectAccount}><LogIn /> Connect your account</button>
            ) : (
              <button className="secondary-button" type="button" onClick={() => void auth.logout()}><LogOut /> Sign out</button>
            )}
            {message && <div className="form-message" role="status">{message}</div>}
          </section>

          <section className="profile-card preferences-card">
            <div className="profile-card-heading"><div><span className="eyebrow">Preferences</span><h2>Make Guardian Lens yours</h2></div></div>
            <div className="preference-row">
              <span className="account-row-icon">{theme === "light" ? <Sun /> : <Moon />}</span>
              <span><strong>Appearance</strong><small>Choose the look that is comfortable for you</small></span>
              <div className="theme-choice" aria-label="Appearance">
                <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun /> Light</button>
                <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon /> Dark</button>
              </div>
            </div>
            <div className="preference-row">
              <span className="account-row-icon"><BellRing /></span>
              <span><strong>Recall alerts</strong><small>Important updates for products on your watchlist</small></span>
              <button className="switch-input" type="button" role="switch" aria-label="Recall alerts" aria-checked={recallAlerts} onClick={() => setRecallAlerts((current) => !current)} />
            </div>
            <div className="preference-row">
              <span className="account-row-icon"><Mail /></span>
              <span><strong>Assessment updates</strong><small>Know when an assessment is accepted or finalized</small></span>
              <button className="switch-input" type="button" role="switch" aria-label="Assessment updates" aria-checked={statusUpdates} onClick={() => setStatusUpdates((current) => !current)} />
            </div>
          </section>
        </div>

        <aside className="profile-secondary">
          <section className="membership-card" id="access">
            <span className="membership-icon"><ShieldCheck /></span>
            <span className="eyebrow">Guardian access</span>
            <h2>One unlock. Every check.</h2>
            <p>Activate Guardian Lens once with testnet GEN. There is no subscription or recurring charge.</p>
            <div className="membership-price"><strong>{ACCESS_PRICE_GEN}</strong><span><b>test GEN</b><small>one-time access</small></span></div>
            <p className={`membership-status ${accessActive ? "active" : ""}`}><span /> {accessChecking ? "Checking access…" : accessActive ? "Access active" : "Activation required"}</p>
            <ul><li><Check /> Full product assessments</li><li><Check /> Sponsored testnet scans</li><li><Check /> History, reports and watchlist</li></ul>
            <button className="membership-button" type="button" onClick={() => void activateAccess()} disabled={paymentPending || accessChecking}>{paymentPending ? "Waiting for validators…" : accessActive ? "Access active" : auth.authenticated ? "Activate access" : "Connect & unlock"}<ChevronRight /></button>
          </section>

          <section className="profile-card privacy-card" id="privacy">
            <span className="profile-card-icon"><ShieldCheck /></span>
            <h2>Your evidence stays private</h2>
            <p>Raw photos, videos, identity details, and health information are not published on-chain.</p>
            <a href="/profile#privacy">Review privacy controls <ChevronRight /></a>
          </section>
        </aside>
      </div>
    </section>
  );
}
