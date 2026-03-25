import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import * as React from "react";
import type { ReactElement, JSXElementConstructor } from "react";
import { CommercialValueSummaryPdf } from "./CommercialValueSummaryPdf";
import { PropertyRecord, ApproachState } from "../types";
import type { GalleryEntry } from "../image-fingerprint";
import { extractPageMap } from "./extract-page-map";

// ---------------------------------------------------------------------------
// Compute totals (mirrors commercial-value-summary-client.tsx logic)
// ---------------------------------------------------------------------------

function computeTotals(
  records: PropertyRecord[],
  included: Set<number>
): { totalRecommended: number; totalAssessed: number } {
  const seen = new Map<
    number,
    { recommended: number; assessed: number; anyIncluded: boolean }
  >();

  for (const r of records) {
    const entry = seen.get(r.PropID);
    if (!entry) {
      seen.set(r.PropID, {
        recommended: r.RecommendedVal,
        assessed: r.AssessedVal,
        anyIncluded: included.has(r.PropID),
      });
    } else if (included.has(r.PropID)) {
      entry.anyIncluded = true;
    }
  }

  let totalRecommended = 0;
  let totalAssessed = 0;
  for (const { recommended, assessed, anyIncluded } of seen.values()) {
    if (anyIncluded) {
      totalRecommended += recommended;
      totalAssessed += assessed;
    }
  }
  return { totalRecommended, totalAssessed };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFilename(records: PropertyRecord[]): string {
  const year = records[0]?.Year ?? "unknown";
  const pid = records[0]?.PropID ?? "unknown";
  return `${year}_Commercial_Value_Summary_${pid}.pdf`;
}

function buildElement(
  records: PropertyRecord[],
  included: Set<number>,
  totalRecommended: number,
  totalAssessed: number,
  galleryEntries: GalleryEntry[],
  pageMap: Map<number, number>,
  approachStates: Map<number, ApproachState>
): ReactElement<DocumentProps, string | JSXElementConstructor<DocumentProps>> {
  return React.createElement(CommercialValueSummaryPdf, {
    records,
    included,
    totalRecommended,
    totalAssessed,
    galleryEntries,
    pageMap,
    approachStates,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

// ---------------------------------------------------------------------------
// Two-pass rendering
// Pass 1: render with empty pageMap to get a complete PDF for text extraction.
// Pass 2: extract PropID→page from pass-1 blob, re-render with accurate pageMap.
// ---------------------------------------------------------------------------

async function buildBlob(
  records: PropertyRecord[],
  included: Set<number>,
  galleryEntries: GalleryEntry[],
  approachStates: Map<number, ApproachState>
): Promise<Blob> {
  const { totalRecommended, totalAssessed } = computeTotals(records, included);

  // Pass 1 — render without page numbers (overview table always present, so always two-pass)
  const pass1Blob = await pdf(
    buildElement(records, included, totalRecommended, totalAssessed, galleryEntries, new Map(), approachStates)
  ).toBlob();

  // Extract accurate page numbers from the rendered PDF
  const pageMap = await extractPageMap(pass1Blob);

  // Pass 2 — re-render with the correct pageMap
  return pdf(
    buildElement(records, included, totalRecommended, totalAssessed, galleryEntries, pageMap, approachStates)
  ).toBlob();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Open the PDF in a new browser tab (View button). */
export async function viewPdf(
  records: PropertyRecord[],
  included: Set<number>,
  galleryEntries: GalleryEntry[],
  approachStates: Map<number, ApproachState>
): Promise<void> {
  const blob = await buildBlob(records, included, galleryEntries, approachStates);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Trigger a file download (Download button). */
export async function downloadPdf(
  records: PropertyRecord[],
  included: Set<number>,
  galleryEntries: GalleryEntry[],
  approachStates: Map<number, ApproachState>
): Promise<void> {
  const blob = await buildBlob(records, included, galleryEntries, approachStates);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename(records);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
