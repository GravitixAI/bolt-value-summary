"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { PropertyRecord } from "./types";

// ---------------------------------------------------------------------------
// Perceptual fingerprinting
// ---------------------------------------------------------------------------

const THUMB_SIZE = 32; // 16×16 = 256 grayscale values per fingerprint
const MATCH_THRESHOLD = 15; // max average per-pixel difference to be "same"

function imageProxyUrl(uncPath: string): string {
  return `/api/property-image?path=${encodeURIComponent(uncPath)}`;
}

/**
 * Load an image from a URL into an off-screen canvas, scale it to THUMB_SIZE²,
 * and return a grayscale fingerprint as a Float32Array.
 */
function computeFingerprint(src: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_SIZE;
      canvas.height = THUMB_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2D context"));

      ctx.drawImage(img, 0, 0, THUMB_SIZE, THUMB_SIZE);
      const { data } = ctx.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE);

      const fp = new Float32Array(THUMB_SIZE * THUMB_SIZE);
      for (let i = 0; i < fp.length; i++) {
        const base = i * 4;
        // Weighted grayscale (ITU-R BT.601)
        fp[i] = 0.299 * data[base] + 0.587 * data[base + 1] + 0.114 * data[base + 2];
      }
      resolve(fp);
    };

    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function fingerprintsMatch(a: Float32Array, b: Float32Array): boolean {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length < MATCH_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawItem {
  imagePath: string;
  propIds: number[];
}

interface GalleryItem extends RawItem {
  fingerprint: Float32Array | null;
}

// ---------------------------------------------------------------------------
// Build initial (path-deduplicated) items from records
// ---------------------------------------------------------------------------

function buildRawItems(records: PropertyRecord[]): RawItem[] {
  const map = new Map<string, number[]>();
  for (const r of records) {
    if (!r.MainImagePath) continue;
    const key = r.MainImagePath;
    const ids = map.get(key);
    if (ids) {
      if (!ids.includes(r.PropID)) ids.push(r.PropID);
    } else {
      map.set(key, [r.PropID]);
    }
  }
  return Array.from(map.entries()).map(([imagePath, propIds]) => ({
    imagePath,
    propIds: propIds.sort((a, b) => a - b),
  }));
}

/**
 * Merge items whose fingerprints are perceptually identical.
 * Items without a fingerprint (load failed) are kept as-is.
 */
function mergeByFingerprint(items: GalleryItem[]): GalleryItem[] {
  const merged: GalleryItem[] = [];

  for (const item of items) {
    if (!item.fingerprint) {
      merged.push(item);
      continue;
    }

    const match = merged.find(
      (m) => m.fingerprint && fingerprintsMatch(m.fingerprint, item.fingerprint!)
    );

    if (match) {
      // Absorb this item's propIds into the existing matched group
      for (const pid of item.propIds) {
        if (!match.propIds.includes(pid)) match.propIds.push(pid);
      }
      match.propIds.sort((a, b) => a - b);
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function GalleryCard({ item }: { item: GalleryItem }) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading");

  const label =
    item.propIds.length === 1
      ? `PID: ${item.propIds[0]}`
      : `PIDs: ${item.propIds.join(", ")}`;

  const src = imageProxyUrl(item.imagePath);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>

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
          src={src}
          alt={label}
          crossOrigin="anonymous"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "absolute inset-0 opacity-0"
          }`}
        />
      </div>

      <p className="break-all text-xs text-muted-foreground">{item.imagePath}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main gallery — loads fingerprints then merges
// ---------------------------------------------------------------------------

type GalleryState =
  | { phase: "fingerprinting"; items: RawItem[] }
  | { phase: "done"; items: GalleryItem[] };

interface Props {
  records: PropertyRecord[];
}

export function ImageGallery({ records }: Props) {
  const rawItems = React.useMemo(() => buildRawItems(records), [records]);

  const [state, setState] = React.useState<GalleryState>({
    phase: "fingerprinting",
    items: rawItems,
  });

  // Reset whenever records change
  React.useEffect(() => {
    if (rawItems.length === 0) {
      setState({ phase: "done", items: [] });
      return;
    }

    setState({ phase: "fingerprinting", items: rawItems });

    let cancelled = false;

    (async () => {
      // Compute all fingerprints in parallel
      const results = await Promise.allSettled(
        rawItems.map((item) => computeFingerprint(imageProxyUrl(item.imagePath)))
      );

      if (cancelled) return;

      const withFingerprints: GalleryItem[] = rawItems.map((item, i) => ({
        ...item,
        fingerprint: results[i].status === "fulfilled" ? results[i].value : null,
      }));

      setState({ phase: "done", items: mergeByFingerprint(withFingerprints) });
    })();

    return () => {
      cancelled = true;
    };
  }, [rawItems]);

  if (rawItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <ImageOff className="h-10 w-10 opacity-30" strokeWidth={1.5} />
        <p className="text-sm">No images available for this property.</p>
      </div>
    );
  }

  if (state.phase === "fingerprinting") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <span className="animate-pulse text-sm">Analyzing images…</span>
      </div>
    );
  }

  const displayItems = state.items;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {displayItems.map((item) => (
        <GalleryCard key={item.imagePath} item={item} />
      ))}
    </div>
  );
}
