import { NextRequest, NextResponse } from "next/server";

const clean = (value: string) => value.replace(/[^a-zA-Z0-9 ._\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);

export async function GET(request: NextRequest) {
  const product = clean(request.nextUrl.searchParams.get("product") || "");
  const manufacturer = clean(request.nextUrl.searchParams.get("manufacturer") || "");
  if (!product) return NextResponse.json({ results: [] });

  const terms = [`product_description:\"${product}\"`];
  if (manufacturer) terms.push(`recalling_firm:\"${manufacturer}\"`);
  const endpoint = new URL("https://api.fda.gov/food/enforcement.json");
  endpoint.searchParams.set("search", terms.join("+AND+"));
  endpoint.searchParams.set("limit", "8");

  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" }, next: { revalidate: 1800 } });
    if (response.status === 404) return NextResponse.json({ results: [] });
    if (!response.ok) throw new Error(`openFDA returned ${response.status}`);
    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    const results = (payload.results || []).map((item) => ({
      sourceId: `FDA-${String(item.recall_number || item.event_id || "UNKNOWN")}`,
      classification: String(item.classification || "Unclassified"),
      recallingFirm: String(item.recalling_firm || "Unknown firm"),
      productDescription: String(item.product_description || "").slice(0, 700),
      reason: String(item.reason_for_recall || "").slice(0, 700),
      status: String(item.status || "Unknown")
    }));
    return NextResponse.json({ results, authoritative: false, note: "Preview only. GenLayer validators independently retrieve sources." });
  } catch (error) {
    return NextResponse.json({ results: [], authoritative: false, error: error instanceof Error ? error.message : "Recall lookup failed" }, { status: 502 });
  }
}
