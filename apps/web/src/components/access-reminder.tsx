"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, WalletCards } from "lucide-react";
import { ACCESS_PRICE_GEN } from "@guardian/shared";
import { useGuardianAuth } from "@/lib/auth";

export function AccessReminder() {
  const auth = useGuardianAuth();

  return (
    <section className="access-reminder" aria-label="Guardian Lens testnet access">
      <div className="access-reminder-icon"><ShieldCheck /></div>
      <div className="access-reminder-copy">
        <span>Testnet access</span>
        <strong>Unlock every Guardian Lens check for {ACCESS_PRICE_GEN} test GEN</strong>
        <small><Check /> One-time access <Check /> No subscription <Check /> Sponsored scans after activation</small>
      </div>
      <Link className="access-reminder-action" href="/profile#access">
        <WalletCards /> {auth.authenticated ? "Activate access" : "Connect & unlock"} <ArrowRight />
      </Link>
    </section>
  );
}
