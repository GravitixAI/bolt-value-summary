import { pdf } from "@react-pdf/renderer";
import * as React from "react";
import { SalientFactsPdf } from "./SalientFactsPdf";
import { PropertyRecord } from "@/app/commercial-value-summary/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFilename(records: PropertyRecord[], year: string): string {
  const pid = records[0]?.PropID ?? "unknown";
  return `${year}_Summary_of_Salient_Facts_${pid}.pdf`;
}

async function buildBlob(
  records: PropertyRecord[],
  included: Set<number>,
  year: string
): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(React.createElement(SalientFactsPdf, { records, included, year }) as any).toBlob();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function viewSalientPdf(
  records: PropertyRecord[],
  included: Set<number>,
  year: string
): Promise<void> {
  const blob = await buildBlob(records, included, year);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadSalientPdf(
  records: PropertyRecord[],
  included: Set<number>,
  year: string
): Promise<void> {
  const blob = await buildBlob(records, included, year);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename(records, year);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
