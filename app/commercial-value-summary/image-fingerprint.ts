/**
 * Shared perceptual fingerprinting logic used by both the UI gallery and
 * the PDF generator so they always produce identical image deduplication.
 */

const THUMB_SIZE = 32;
const MATCH_THRESHOLD = 15;

export interface GalleryEntry {
  /** Absolute proxy URL: /api/property-image?path=... */
  imageSrc: string;
  /** "PID: 12345" or "PIDs: 12345, 67890" */
  label: string;
  /** All property IDs that map to this image (after deduplication). */
  propIds: number[];
}

function imageProxyUrl(uncPath: string): string {
  return `/api/property-image?path=${encodeURIComponent(uncPath)}`;
}

interface RawItem {
  imagePath: string;
  propIds: number[];
}

interface FingerprintedItem extends RawItem {
  fingerprint: Float32Array | null;
}

/** Step 1: path-based dedup */
function buildRawItems(records: { PropID: number; MainImagePath: string | null }[]): RawItem[] {
  const map = new Map<string, number[]>();
  for (const r of records) {
    if (!r.MainImagePath) continue;
    const ids = map.get(r.MainImagePath);
    if (ids) {
      if (!ids.includes(r.PropID)) ids.push(r.PropID);
    } else {
      map.set(r.MainImagePath, [r.PropID]);
    }
  }
  return Array.from(map.entries()).map(([imagePath, propIds]) => ({
    imagePath,
    propIds: propIds.sort((a, b) => a - b),
  }));
}

/** Step 2: compute a grayscale thumbnail fingerprint for one image URL */
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
        const b = i * 4;
        fp[i] = 0.299 * data[b] + 0.587 * data[b + 1] + 0.114 * data[b + 2];
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

/** Step 3: merge items with perceptually identical fingerprints */
function mergeByFingerprint(items: FingerprintedItem[]): FingerprintedItem[] {
  const merged: FingerprintedItem[] = [];
  for (const item of items) {
    if (!item.fingerprint) {
      merged.push(item);
      continue;
    }
    const match = merged.find(
      (m) => m.fingerprint && fingerprintsMatch(m.fingerprint, item.fingerprint!)
    );
    if (match) {
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

/**
 * Run the full fingerprinting pipeline on a set of records and return
 * deduplicated GalleryEntry objects ready for the UI and PDF.
 *
 * Must be called in a browser context (requires canvas + Image).
 */
export async function buildFingerprintedGallery(
  records: { PropID: number; MainImagePath: string | null }[]
): Promise<GalleryEntry[]> {
  const rawItems = buildRawItems(records);
  if (rawItems.length === 0) return [];

  const results = await Promise.allSettled(
    rawItems.map((item) => computeFingerprint(imageProxyUrl(item.imagePath)))
  );

  const withFp: FingerprintedItem[] = rawItems.map((item, i) => ({
    ...item,
    fingerprint: results[i].status === "fulfilled"
      ? (results[i] as PromiseFulfilledResult<Float32Array>).value
      : null,
  }));

  return mergeByFingerprint(withFp).map((item) => ({
    imageSrc: imageProxyUrl(item.imagePath),
    propIds: item.propIds,
    label:
      item.propIds.length === 1
        ? `PID: ${item.propIds[0]}`
        : `PIDs: ${item.propIds.join(", ")}`,
  }));
}
