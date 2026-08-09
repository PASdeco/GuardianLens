"use client";

import Link from "next/link";
import { ArrowRight, BellRing, BookmarkCheck, ShieldCheck, Trash2 } from "lucide-react";
import { useGuardianStore } from "@/lib/store";
import { RiskBadge } from "./risk-badge";

export function WatchlistView() {
  const { scans, watchlist, toggleWatchlist } = useGuardianStore();
  const watched = scans.filter((scan) => watchlist.includes(scan.id));
  return (
    <section className="content-page">
      <div className="page-heading"><div><span className="eyebrow">Recall monitoring</span><h1>Watchlist</h1><p>Products here are checked again by the free scheduled recall workflow.</p></div><span className="count-chip"><BellRing /> {watched.length} monitored</span></div>
      {watched.length === 0 ? (
        <div className="empty-state"><BookmarkCheck /><h2>No watched products</h2><p>Add an assessed product from its result page.</p><Link className="primary-button compact" href="/">Scan a product <ArrowRight /></Link></div>
      ) : (
        <div className="watch-grid">
          {watched.map((scan) => (
            <article className="watch-card" key={scan.id}>
              <div className="watch-card-top"><span className="product-thumb large"><ShieldCheck /></span>{scan.assessment && <RiskBadge level={scan.assessment.risk_level} />}</div>
              <h2>{scan.productName}</h2><p>{scan.manufacturer || scan.seller || "Product identity is incomplete"}</p>
              <div className="watch-meta"><span>Last checked</span><strong>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(scan.updatedAt))}</strong></div>
              <div className="watch-actions"><Link href={`/scan/${scan.id}`}>Open assessment <ArrowRight /></Link><button className="icon-button" type="button" title="Remove from watchlist" onClick={() => toggleWatchlist(scan.id)}><Trash2 /></button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
