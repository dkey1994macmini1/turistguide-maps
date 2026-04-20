import type { PlanReadModel } from "@/types/api";
import { PlanViewerClient } from "./plan-viewer-client";

// This is a server component that just loads data and renders the client component
// For now we use a simple approach: pass slug, client component fetches data
export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlanViewerClient slug={slug} />;
}