"use client";

import * as React from "react";
import { OverviewTable } from "./overview-table";
import { CaseSection } from "./case-section";
import { GrandTotals } from "./grand-totals";
import { ImageGallery, buildFingerprintedGallery, GalleryEntry } from "./image-gallery";
import { CommercialSearchRow } from "./commercial-search-row";
import { ValueSummaryNavbar } from "@/components/value-summary-navbar";
import { BackToTopButton } from "@/components/back-to-top-button";
import { CommercialValueSummaryResponse, PropertyRecord, ApproachState } from "./types";
import { hasApproach } from "./format";

type Tab = "summary" | "images";

type Status = "idle" | "loading" | "success" | "error";

function computeTotals(
  records: PropertyRecord[],
  included: Set<number>
): { totalRecommended: number; totalAssessed: number } {
  const seen = new Map<number, { recommended: number; assessed: number; anyIncluded: boolean }>();

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

export function CommercialValueSummaryClient() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [records, setRecords] = React.useState<PropertyRecord[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [included, setIncluded] = React.useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = React.useState<Tab>("summary");
  const [galleryEntries, setGalleryEntries] = React.useState<GalleryEntry[]>([]);
  const [galleryAnalyzing, setGalleryAnalyzing] = React.useState(false);
  const [approachStates, setApproachStates] = React.useState<Map<number, ApproachState>>(new Map());

  async function handleSearch(propertyId: string, year: string) {
    setStatus("loading");
    setError(null);
    setRecords([]);
    setIncluded(new Set());
    setActiveTab("summary");
    setGalleryEntries([]);
    setGalleryAnalyzing(false);
    setApproachStates(new Map());

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const url = `${base}/bolt-rest-engine/api/value-summaries/commercial?pid=${encodeURIComponent(propertyId)}&year=${encodeURIComponent(year)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      const json: CommercialValueSummaryResponse = await res.json();
      if (!json.data?.length) throw new Error("No results found for the specified property and year.");
      const data = json.data;
      setRecords(data);
      setIncluded(new Set(data.map((r) => r.PropID)));
      setApproachStates(new Map(data.map((r) => [
        r.PropID,
        {
          cost: hasApproach(r.ApprMethod, "C"),
          income: hasApproach(r.ApprMethod, "I"),
          market: hasApproach(r.ApprMethod, "M"),
          showSqFt: r.Land_ApprMethod === "SQ",
        },
      ])));
      setStatus("success");

      // Run fingerprinting pipeline in the background so it's ready for the PDF
      setGalleryAnalyzing(true);
      buildFingerprintedGallery(data)
        .then(setGalleryEntries)
        .finally(() => setGalleryAnalyzing(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function toggleApproach(propId: number, approach: keyof ApproachState) {
    setApproachStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(propId);
      if (cur) next.set(propId, { ...cur, [approach]: !cur[approach] });
      return next;
    });
  }

  function toggleIncluded(propId: number) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(propId)) next.delete(propId);
      else next.add(propId);
      return next;
    });
  }

  function scrollToProp(propId: number) {
    const el = document.getElementById(`prop-${propId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const { totalRecommended, totalAssessed } = React.useMemo(
    () => computeTotals(records, included),
    [records, included]
  );

  // Filter gallery entries to only those with at least one included PID,
  // and re-label to show only the included PIDs.
  const filteredGalleryEntries = React.useMemo(() => {
    return galleryEntries
      .map((entry) => {
        const visibleIds = entry.propIds.filter((id) => included.has(id));
        if (visibleIds.length === 0) return null;
        return {
          ...entry,
          propIds: visibleIds,
          label: visibleIds.length === 1
            ? `PID: ${visibleIds[0]}`
            : `PIDs: ${visibleIds.join(", ")}`,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [galleryEntries, included]);

  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfWarning, setPdfWarning] = React.useState<"view" | "download" | null>(null);

  const LARGE_PDF_THRESHOLD = 20;
  const includedCount = React.useMemo(
    () => new Set(records.filter((r) => included.has(r.PropID)).map((r) => r.PropID)).size,
    [records, included]
  );

  async function triggerPdf(mode: "view" | "download") {
    if (includedCount >= LARGE_PDF_THRESHOLD) setPdfWarning(mode);
    setPdfLoading(true);
    try {
      if (mode === "view") {
        const { viewPdf } = await import("./pdf/generate-pdf");
        await viewPdf(records, included, filteredGalleryEntries, approachStates);
      } else {
        const { downloadPdf } = await import("./pdf/generate-pdf");
        await downloadPdf(records, included, filteredGalleryEntries, approachStates);
      }
    } finally {
      setPdfLoading(false);
      setPdfWarning(null);
    }
  }

  function handleView() {
    if (!records.length) return;
    triggerPdf("view");
  }

  function handleDownload() {
    if (!records.length) return;
    triggerPdf("download");
  }

  const searchRow = (
    <CommercialSearchRow
      onSearch={handleSearch}
      onView={handleView}
      onDownload={handleDownload}
      hasResults={status === "success" && records.length > 0}
      isLoading={status === "loading"}
      pdfLoading={pdfLoading}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ValueSummaryNavbar subRow={searchRow} />

      <main className="container py-10 sm:py-14">
        {status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Enter a Property ID and year above to load the Commercial Value Summary.
          </p>
        )}

        {status === "loading" && (
          <p className="mt-8 text-sm text-muted-foreground animate-pulse">Loading…</p>
        )}

        {status === "error" && (
          <div className="mt-8 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {status === "success" && records.length > 0 && (
          <div className="space-y-6 pb-36">
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-border">
              {(["summary", "images"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "summary" && (
              <div className="space-y-8">
                {records.length > 1 && (
                  <OverviewTable
                    records={records}
                    included={included}
                    onRowClick={scrollToProp}
                    onToggle={toggleIncluded}
                  />
                )}

                {records.map((r) => (
                  <CaseSection
                    key={r.PropID}
                    record={r}
                    included={included.has(r.PropID)}
                    onToggle={() => toggleIncluded(r.PropID)}
                    approachState={approachStates.get(r.PropID) ?? { cost: false, income: false, market: false }}
                    onToggleApproach={(approach) => toggleApproach(r.PropID, approach)}
                  />
                ))}

                <GrandTotals
                  totalRecommendedVal={totalRecommended}
                  totalAssessedVal={totalAssessed}
                />
              </div>
            )}

            {activeTab === "images" && (
              <ImageGallery entries={filteredGalleryEntries} isAnalyzing={galleryAnalyzing} />
            )}
          </div>
        )}
      </main>

      <BackToTopButton />

      {/* Large PDF generation notice — stays visible until generation completes */}
      {pdfWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Generating PDF…
            </h2>
            <p className="mb-2 text-sm text-muted-foreground">
              This summary contains{" "}
              <span className="font-semibold text-foreground">{includedCount} properties</span>.
              PDF generation may take a few moments to complete.
            </p>
            <p className="text-sm text-muted-foreground">
              If your browser displays a{" "}
              <span className="font-semibold text-foreground">&ldquo;Page Unresponsive&rdquo;</span>{" "}
              or{" "}
              <span className="font-semibold text-foreground">&ldquo;Wait / Exit Page&rdquo;</span>{" "}
              prompt, click{" "}
              <span className="font-semibold text-foreground">Wait</span> to allow the process to finish.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
