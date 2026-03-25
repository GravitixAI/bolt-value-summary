"use client";

import * as React from "react";
import { OverviewTable } from "@/app/commercial-value-summary/overview-table";
import { CommercialSearchRow } from "@/app/commercial-value-summary/commercial-search-row";
import { ValueSummaryNavbar } from "@/components/value-summary-navbar";
import { BackToTopButton } from "@/components/back-to-top-button";
import { CommercialValueSummaryResponse, PropertyRecord } from "@/app/commercial-value-summary/types";
import { SalientFactsCaseSection } from "./salient-facts-case-section";

type Status = "idle" | "loading" | "success" | "error";

export function SalientFactsClient() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [records, setRecords] = React.useState<PropertyRecord[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [included, setIncluded] = React.useState<Set<number>>(new Set());
  const [selectedYear, setSelectedYear] = React.useState<string>("");
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfWarning, setPdfWarning] = React.useState(false);

  const LARGE_PDF_THRESHOLD = 20;

  async function handleSearch(propertyId: string, year: string) {
    setStatus("loading");
    setError(null);
    setRecords([]);
    setIncluded(new Set());
    setSelectedYear(year);

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
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
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

  const includedCount = React.useMemo(
    () => new Set(records.filter((r) => included.has(r.PropID)).map((r) => r.PropID)).size,
    [records, included]
  );

  async function triggerPdf(mode: "view" | "download") {
    if (includedCount >= LARGE_PDF_THRESHOLD) setPdfWarning(true);
    setPdfLoading(true);
    try {
      if (mode === "view") {
        const { viewSalientPdf } = await import("./pdf/generate-salient-pdf");
        await viewSalientPdf(records, included, selectedYear);
      } else {
        const { downloadSalientPdf } = await import("./pdf/generate-salient-pdf");
        await downloadSalientPdf(records, included, selectedYear);
      }
    } finally {
      setPdfLoading(false);
      setPdfWarning(false);
    }
  }

  const searchRow = (
    <CommercialSearchRow
      onSearch={handleSearch}
      onView={() => { if (records.length) triggerPdf("view"); }}
      onDownload={() => { if (records.length) triggerPdf("download"); }}
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
            Enter a Property ID and year above to load the Summary of Salient Facts.
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
              <SalientFactsCaseSection
                key={r.PropID}
                record={r}
                included={included.has(r.PropID)}
                onToggle={() => toggleIncluded(r.PropID)}
              />
            ))}

          </div>
        )}
      </main>

      <BackToTopButton />

      {pdfWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <h2 className="mb-3 text-base font-semibold text-foreground">Generating PDF…</h2>
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
