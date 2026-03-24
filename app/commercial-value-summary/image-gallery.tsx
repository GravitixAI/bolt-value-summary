"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { PropertyRecord } from "./types";
import { buildFingerprintedGallery, GalleryEntry } from "./image-fingerprint";

// ---------------------------------------------------------------------------
// Gallery card
// ---------------------------------------------------------------------------

function GalleryCard({ entry }: { entry: GalleryEntry }) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{entry.label}</p>

      <div className="relative min-h-64 w-full overflow-hidden rounded-md bg-muted">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse text-xs text-muted-foreground">Loading image…</span>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8 opacity-40" strokeWidth={1.5} />
            <span className="text-xs">Image unavailable</span>
          </div>
        )}

        <img
          src={entry.imageSrc}
          alt={entry.label}
          crossOrigin="anonymous"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "absolute inset-0 opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main gallery
// ---------------------------------------------------------------------------

interface Props {
  /** Pre-computed gallery entries from the fingerprinting pipeline. */
  entries: GalleryEntry[];
  /** Whether fingerprinting is still in progress. */
  isAnalyzing: boolean;
}

export function ImageGallery({ entries, isAnalyzing }: Props) {
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <span className="animate-pulse text-sm">Analyzing images…</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <ImageOff className="h-10 w-10 opacity-30" strokeWidth={1.5} />
        <p className="text-sm">No images available for this property.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {entries.map((entry) => (
        <GalleryCard key={entry.imageSrc} entry={entry} />
      ))}
    </div>
  );
}

// Re-export so CommercialValueSummaryClient can import from one place
export { buildFingerprintedGallery };
export type { GalleryEntry };
