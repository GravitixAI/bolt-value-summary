"use client";

import * as React from "react";
import { Eye, Download } from "lucide-react";

const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - 2020 + 1 },
  (_, i) => currentYear - i
);

interface Props {
  onSearch: (propertyId: string, year: string) => void;
  onView?: () => void;
  onDownload?: () => void;
  hasResults: boolean;
  isLoading: boolean;
  pdfLoading?: boolean;
}

export function CommercialSearchRow({
  onSearch,
  onView,
  onDownload,
  hasResults,
  isLoading,
  pdfLoading = false,
}: Props) {
  const [propertyId, setPropertyId] = React.useState("");
  const [year, setYear] = React.useState(String(currentYear));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId.trim() || !year) return;
    onSearch(propertyId.trim(), year);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="container flex flex-wrap items-center gap-3 py-2"
    >
      {/* Left: Property ID + Year */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="Property ID"
          aria-label="Property ID"
          className="h-8 w-40 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
        />

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Year"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!propertyId.trim() || isLoading}
          className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Loading…" : "Search"}
        </button>
      </div>

      {/* Right: View + Download */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onView}
          disabled={!hasResults || pdfLoading}
          aria-label="View report"
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
          {pdfLoading ? "Building…" : "View"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!hasResults || pdfLoading}
          aria-label="Download report"
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          {pdfLoading ? "Building…" : "Download"}
        </button>
      </div>
    </form>
  );
}
