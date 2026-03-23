"use client";

import * as React from "react";
import { OverviewTable } from "./overview-table";
import { CaseSection } from "./case-section";
import { GrandTotals } from "./grand-totals";
import { ImageGallery } from "./image-gallery";
import { CommercialSearchRow } from "./commercial-search-row";
import { ValueSummaryNavbar } from "@/components/value-summary-navbar";
import { BackToTopButton } from "@/components/back-to-top-button";
import { CommercialValueSummaryResponse, PropertyRecord } from "./types";

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

  async function handleSearch(propertyId: string, year: string) {
    setStatus("loading");
    setError(null);
    setRecords([]);
    setIncluded(new Set());
    setActiveTab("summary");

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const url = `${base}/bolt-rest-engine/api/value-summaries/commercial?pid=${encodeURIComponent(propertyId)}&year=${encodeURIComponent(year)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      const json: CommercialValueSummaryResponse = await res.json();
      if (!json.data?.length) throw new Error("No results found for the specified property and year.");
      setRecords(json.data);
      setIncluded(new Set(json.data.map((r) => r.PropID)));
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

  const { totalRecommended, totalAssessed } = React.useMemo(
    () => computeTotals(records, included),
    [records, included]
  );

  const searchRow = (
    <CommercialSearchRow
      onSearch={handleSearch}
      hasResults={status === "success" && records.length > 0}
      isLoading={status === "loading"}
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
                  />
                ))}

                <GrandTotals
                  totalRecommendedVal={totalRecommended}
                  totalAssessedVal={totalAssessed}
                />
              </div>
            )}

            {activeTab === "images" && <ImageGallery records={records} />}
          </div>
        )}
      </main>

      <BackToTopButton />
    </div>
  );
}
