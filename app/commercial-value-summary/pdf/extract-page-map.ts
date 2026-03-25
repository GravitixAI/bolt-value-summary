/**
 * Given a PDF blob from the first rendering pass, scan every page for text
 * matching "PID: <number>" (the marker we embed in each case section header)
 * and return a Map of PropID → 1-based page number.
 *
 * Uses pdfjs-dist running entirely in the browser (no worker thread needed
 * for small documents — we use the legacy build that bundles the worker).
 */
export async function extractPageMap(blob: Blob): Promise<Map<number, number>> {
  // Dynamic import keeps pdfjs out of the initial bundle and avoids SSR issues.
  const pdfjsLib = await import("pdfjs-dist");

  // Point at the worker file served from /public (copied from node_modules at build time).
  // basePath must be included — workerSrc is fetched directly by the browser.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const pageMap = new Map<number, number>();

  // Matches the invisible anchor marker embedded in each case section:
  // ##PID:212834## — unique format that cannot appear anywhere else in the doc.
  const MARKER_RE = /##PID:(\d+)##/g;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();

    // Concatenate without spaces — the marker is a single atomic text item.
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("");

    MARKER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKER_RE.exec(pageText)) !== null) {
      const propId = parseInt(match[1], 10);
      if (!pageMap.has(propId)) {
        pageMap.set(propId, pageNum);
      }
    }
  }

  return pageMap;
}
