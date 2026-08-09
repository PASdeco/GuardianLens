import { PublicReport } from "@/components/public-report";

export default async function ReportPage({ params }: { params: Promise<{ reportRef: string }> }) {
  const { reportRef } = await params;
  return <PublicReport reportRef={decodeURIComponent(reportRef)} />;
}
