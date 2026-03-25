#!/usr/bin/env node
/**
 * Post-build script for standalone output.
 * - Copies .next/static and public into .next/standalone
 * - Flattens the pnpm virtual store inside standalone/node_modules/.pnpm
 *   into standalone/node_modules so that Next.js require-hook can resolve
 *   all transitive dependencies without symlinks (required on Windows/IIS).
 */
import { cpSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.warn("Standalone output not found. Run 'next build' first.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 1. Copy .next/static → standalone/.next/static
// ---------------------------------------------------------------------------
const staticSrc = join(root, ".next", "static");
const staticDest = join(standalone, ".next", "static");
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("Copied .next/static to standalone");
}

// ---------------------------------------------------------------------------
// 2. Copy public → standalone/public
// ---------------------------------------------------------------------------
const publicSrc = join(root, "public");
const publicDest = join(standalone, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("Copied public to standalone");
}

// ---------------------------------------------------------------------------
// 3. Flatten the pnpm virtual store that Next.js copied into standalone.
//
//    pnpm puts packages at:
//      standalone/node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/
//
//    Node's CJS resolver only looks at the flat:
//      standalone/node_modules/<pkg>/
//
//    So we copy every package from the .pnpm store into the flat location
//    if it isn't already there.
// ---------------------------------------------------------------------------
const standaloneNm = join(standalone, "node_modules");
const standalonePnpm = join(standaloneNm, ".pnpm");

if (existsSync(standalonePnpm)) {
  const storeEntries = readdirSync(standalonePnpm, { withFileTypes: true });

  for (const entry of storeEntries) {
    if (!entry.isDirectory()) continue;

    // Entry name examples:
    //   @swc+helpers@0.5.15
    //   styled-jsx@5.1.6_@babel+core@7.28.5_react@19.2.0
    //   next@16.0.1_@babel+core@7.2_...
    const storeDir = join(standalonePnpm, entry.name, "node_modules");
    if (!existsSync(storeDir)) continue;

    const pkgDirs = readdirSync(storeDir, { withFileTypes: true });

    for (const pkgEntry of pkgDirs) {
      if (!pkgEntry.isDirectory()) continue;

      const pkgName = pkgEntry.name; // e.g. "@swc" or "styled-jsx"

      // Handle scoped packages: the scope dir contains the actual package dirs
      if (pkgName.startsWith("@")) {
        const scopeDir = join(storeDir, pkgName);
        const scopedPkgs = readdirSync(scopeDir, { withFileTypes: true });

        for (const scopedPkg of scopedPkgs) {
          if (!scopedPkg.isDirectory()) continue;
          const fullName = `${pkgName}/${scopedPkg.name}`;
          const dest = join(standaloneNm, pkgName, scopedPkg.name);
          if (!existsSync(dest)) {
            mkdirSync(join(standaloneNm, pkgName), { recursive: true });
            cpSync(join(scopeDir, scopedPkg.name), dest, { recursive: true });
            console.log(`  Flattened: ${fullName}`);
          }
        }
      } else {
        const dest = join(standaloneNm, pkgName);
        if (!existsSync(dest)) {
          cpSync(join(storeDir, pkgName), dest, { recursive: true });
          console.log(`  Flattened: ${pkgName}`);
        }
      }
    }
  }

  console.log("Flattened pnpm store into standalone/node_modules");
}
