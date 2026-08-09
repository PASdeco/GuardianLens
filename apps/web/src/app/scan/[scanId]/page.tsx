import { ScanDetail } from "@/components/scan-detail";

export default async function ScanPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  return <ScanDetail scanId={scanId} />;
}
