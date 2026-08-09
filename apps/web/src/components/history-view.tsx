"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useGuardianStore } from "@/lib/store";
import { RiskBadge } from "./risk-badge";

export function HistoryView() {
  const { scans } = useGuardianStore();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => scans.filter((scan) => `${scan.productName} ${scan.manufacturer} ${scan.seller}`.toLowerCase().includes(query.toLowerCase())), [query, scans]);
  return (
    <section className="content-page">
      <div className="page-heading">
        <div><span className="eyebrow">Private workspace</span><h1>Scan history</h1><p>Review evidence, consensus status, reports, and challenges.</p></div>
        <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /></label>
      </div>
      <div className="history-table">
        <div className="history-head"><span>Product</span><span>Checked</span><span>Status</span><span>Assessment</span><span /></div>
        {filtered.map((scan) => (
          <Link className="history-row" href={`/scan/${scan.id}`} key={scan.id}>
            <span className="history-product"><span className="product-thumb"><ShieldCheck /></span><span><strong>{scan.productName}</strong><small>{scan.manufacturer || "Manufacturer not provided"}</small></span></span>
            <span><CalendarDays /> {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(scan.createdAt))}</span>
            <span className="status-chip">{scan.status.replaceAll("_", " ").toLowerCase()}</span>
            <span>{scan.assessment ? <RiskBadge level={scan.assessment.risk_level} /> : "Awaiting GenLayer"}</span>
            <span><ArrowRight /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
