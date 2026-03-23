import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_PREFIXES = [
  "\\\\Pacsserver\\Pacsfiles\\OLTP\\",
  "\\\\CAMAarchive\\PACSfiles\\OLTP\\",
];

function isAllowedPath(imagePath: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => imagePath.startsWith(prefix));
}

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get("path");

  if (!imagePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  if (!isAllowedPath(imagePath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  try {
    const data = await readFile(imagePath);
    const mime = mimeType(imagePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Image not found", detail: message }, { status: 404 });
  }
}
