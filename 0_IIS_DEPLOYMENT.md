# IIS Deployment Guide for BOLT Value Summary

This guide covers deploying the BOLT Value Summary Next.js application to a server where IIS acts as a **reverse proxy only**. The Next.js app runs as a standalone Node.js process on port **3014**. No iisnode is used.

---

## Architecture Overview

```
Browser → IIS (port 80/443)
            └── ARR Reverse Proxy
                └── /bolt-value-summary/* → http://localhost:3014/bolt-value-summary{R:1}
                                                └── Next.js standalone (node server.js)
```

IIS handles SSL termination, Windows Auth header forwarding, and routing. The Next.js process handles all application logic.

---

## Base Path Requirement

This application runs at the sub-path `/bolt-value-summary`. Next.js must be configured with a matching `basePath` so all internal routes, `_next/static` asset URLs, and API routes resolve correctly.

### `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/bolt-value-summary",
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
```

> **`output: "standalone"`** — instructs Next.js to produce a self-contained build in `.next/standalone/` that includes only the files needed to run the server. No `node_modules` copy required on the server.

> **`basePath`** must be set before building. The built output bakes this path into all asset URLs. Changing it after building requires a full rebuild.

### Raw asset URLs must include the base path

Next.js automatically prepends `basePath` to paths used through its own APIs (`<Link>`, `<Image>`, `next/font`, the `metadata` export's `icons`, etc.). However, **plain absolute paths in raw HTML attributes or client-side DOM manipulation are not rewritten** — they resolve to the domain root instead of `/bolt-value-summary/`.

**Affected patterns and their fixes:**

| Location | Bad (resolves to domain root) | Fix |
|----------|-------------------------------|-----|
| `<link href="..." />` in JSX | `href="/themes/foo.css"` | prefix with `NEXT_PUBLIC_BASE_PATH` |
| `document.createElement("link")` | `link.href = "/themes/foo.css"` | prefix with `NEXT_PUBLIC_BASE_PATH` |
| `metadata` `icons` / `manifest` in `layout.tsx` | `url: "/favicon.png"` | prefix with `NEXT_PUBLIC_BASE_PATH` |
| `public/site.webmanifest` icon `src` values | `"src": "/android-chrome-192x192.png"` | hardcode full sub-path |
| Raw `<img src="..." />` in components | `src="/android-chrome-192x192.png"` | prefix `src` with `NEXT_PUBLIC_BASE_PATH` |
| `@react-pdf/renderer` image URLs | `window.location.origin + "/logo.png"` | append `NEXT_PUBLIC_BASE_PATH` between origin and filename |
| Relative API URLs used as image `src` (e.g. `/api/property-image?...`) | `/api/property-image?path=...` | prefix with `window.location.origin + NEXT_PUBLIC_BASE_PATH` |
| `pdfjs-dist` `GlobalWorkerOptions.workerSrc` | `"/pdf.worker.min.mjs"` | prefix with `NEXT_PUBLIC_BASE_PATH` |

**Step 1 — configure `.env.local` (dev machine):**

```env
# Inlined at build time — must match basePath in next.config.ts
NEXT_PUBLIC_BASE_PATH=/bolt-value-summary

# Must be empty so the built bundle uses relative API paths and works on any domain
NEXT_PUBLIC_API_BASE_URL=

# NOT inlined — read at dev-server startup only. Tells next.config.ts rewrites()
# where to forward /bolt-rest-engine/* requests during local development.
BOLT_REST_ENGINE_DEV_URL=https://boltdev.cadcollin.org
```

> `NEXT_PUBLIC_` variables are inlined at **build time**. `NEXT_PUBLIC_BASE_PATH` must be present when `pnpm build` runs and match `basePath` in `next.config.ts`. `NEXT_PUBLIC_API_BASE_URL` must remain **empty** so API calls stay relative and work on any domain without rebuilding.

> `BOLT_REST_ENGINE_DEV_URL` is a private (non-`NEXT_PUBLIC_`) variable — it is never inlined into the bundle. It is only read by `next.config.ts` at dev-server startup to proxy `/bolt-rest-engine/*` to the remote dev API, mirroring what IIS does in production.

**Step 2 — prefix raw paths in code:**

```tsx
// app/layout.tsx — metadata icons and manifest
const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: `${bp}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${bp}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
  },
  manifest: `${bp}/site.webmanifest`,
};
```

```ts
// Client-side DOM manipulation (e.g. theme-provider.tsx)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
link.href = `${basePath}/themes/${themeConfig.cssFile}`;
```

**Step 3 — fix `public/site.webmanifest`:**

`site.webmanifest` is served as a static file — no build-time substitution occurs. Hardcode the sub-path directly in the icon `src` values:

```json
{
  "icons": [
    { "src": "/bolt-value-summary/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/bolt-value-summary/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

> If the deployment sub-path ever changes, update `site.webmanifest` manually alongside `next.config.ts` and `.env.local`.

**Step 4 — prefix `<img src>` with `NEXT_PUBLIC_BASE_PATH`:**

Raw `<img src="/logo.png" />` tags bypass Next.js entirely and will 404 under a sub-path. `next/image` `<Image>` is **not** a reliable fix here — in Next.js 16.x with `unoptimized`, it still omits the `basePath` prefix. Use a raw `<img>` with the env var prefix instead:

```tsx
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// eslint-disable-next-line @next/next/no-img-element
<img
  src={`${basePath}/android-chrome-192x192.png`}
  alt="Logo"
  width={36}
  height={36}
/>
```

> Keep the `eslint-disable` comment — it documents that the raw `<img>` is intentional and that the basePath prefix is handling what `next/image` would normally do.

**Step 5 — fix `@react-pdf/renderer` image URLs:**

`@react-pdf/renderer` fetches images via HTTP at render time and requires a full absolute URL. `window.location.origin` gives only the domain — it does not include the sub-path. Append `NEXT_PUBLIC_BASE_PATH` between the origin and the filename:

```ts
// Bad — fetches from domain root
const LOGO_URL = `${window.location.origin}/ccad-logo.png`;

// Good — includes the sub-path
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const LOGO_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}${basePath}/ccad-logo.png`
    : `${basePath}/ccad-logo.png`;
```

**Do not use `<link rel="preload">` for theme CSS** — Next.js does not rewrite its `href`, and the browser will warn that the preloaded resource was not used within a few seconds of the load event (because the theme provider injects the stylesheet client-side after load). Remove any such preload tags; the theme provider handles loading on its own.

---

## Prerequisites

### Server Requirements

- **Node.js** installed on the server (verify: `node --version`)
- **IIS** with the following modules:
  - **URL Rewrite Module** — https://www.iis.net/downloads/microsoft/url-rewrite
  - **Application Request Routing (ARR)** — https://www.iis.net/downloads/microsoft/application-request-routing

### Enable ARR Proxy

1. Open **IIS Manager**
2. Select the **server node** (not the site)
3. Double-click **Application Request Routing Cache**
4. Click **Server Proxy Settings** in the Actions pane
5. Check **Enable proxy**
6. Click **Apply**

---

## Root `web.config`

The root site's `web.config` handles all reverse proxy rules. The `bolt-value-summary` rule is already present:

```xml
<!-- Proxy /bolt-value-summary/* to Node.js on port 3014 -->
<rule name="bolt-value-summary proxy" stopProcessing="true">
  <match url="^bolt-value-summary(.*)" />
  <serverVariables>
    <set name="HTTP_X_REMOTE_USER" value="{LOGON_USER}" />
  </serverVariables>
  <action type="Rewrite" url="http://localhost:3014/bolt-value-summary{R:1}" />
</rule>
```

No `web.config` is needed inside the application folder itself — IIS proxies all matching requests directly to the Node.js process.

---

## Folder Structure (on server)

```
C:\services\bolt-value-summary\       <- App root (or wherever services live)
├── server.js                          <- Standalone Next.js server entry
├── .env.production                    <- Environment variables
└── .next\
    └── standalone\                    <- Self-contained build output
        ├── server.js                  <- (copy to app root, see deployment steps)
        ├── node_modules\              <- Minimal bundled dependencies
        └── .next\
            ├── server\
            └── static\
```

> The `public\` folder must also be copied alongside `server.js` — Next.js standalone does not include it automatically.

---

## Environment Variables

Create `.env.production` in the app root on the server:

```env
# Application
APP_NAME=bolt-value-summary
NODE_ENV=production
PORT=3014

# Logging
LOG_LEVEL=info

# NEXT_PUBLIC_API_BASE_URL must be empty — all API calls use relative paths so the app
# works on any domain without rebuilding. IIS proxies /bolt-rest-engine/* to localhost:3006.
NEXT_PUBLIC_API_BASE_URL=

# Used by the server-side health check route (app/api/health/route.ts) which cannot use
# relative URLs. Defaults to http://localhost:3006 if not set.
BOLT_REST_ENGINE_URL=http://localhost:3006
```

> `NEXT_PUBLIC_API_BASE_URL` is intentionally empty. Client-side fetch calls use relative paths (`/bolt-rest-engine/api/...`) which IIS proxies to `http://localhost:3006/bolt-rest-engine/...`. This means the built bundle works on any domain — dev, staging, or production — without rebuilding.

> **Do not set `NEXT_PUBLIC_API_BASE_URL` to a hardcoded domain.** Because `NEXT_PUBLIC_` variables are inlined at build time, setting it to `https://boltdev.cadcollin.org` would bake that domain permanently into the bundle and break the app on any other server.

---

## Deployment Steps

1. **Ensure `next.config.ts` has `basePath` and `output` set** (see [Base Path Requirement](#base-path-requirement))

2. **Build the application** on the dev machine:
   ```bash
   pnpm build
   ```
   This runs `next build` followed by `scripts/postbuild-standalone.mjs`, which:
   - Copies `.next/static` into `.next/standalone/.next/static`
   - Copies `public/` into `.next/standalone/public`
   - Flattens the pnpm virtual store in `standalone/node_modules` (required on Windows — prevents `Cannot find module` errors at runtime)

3. **Deploy to the server** using the deploy script:
   ```bash
   pnpm deploy:iis
   ```
   This runs `scripts/deploy.bat`, which uses **robocopy** to copy the standalone output to `C:\inetpub\wwwroot\bolt\bolt-value-summary`. It copies:
   - `server.js`, `package.json`
   - `node_modules\`
   - `.next\`
   - `public\`

   > Also copy `.env.production` to `C:\inetpub\wwwroot\bolt\bolt-value-summary\` manually (it is not included in the deploy script as it contains environment-specific values).

4. **Start the Node.js process** using BOLT Server (see [Process Management](#process-management)):
   - Open BOLT Server and add the application if not already onboarded
   - Click **Start** on the `BOLT Value Summary` card
   - Use **Install as Service** to persist across server reboots

   Manual fallback:
   ```powershell
   cd C:\inetpub\wwwroot\bolt\bolt-value-summary
   $env:PORT=3014; node server.js
   ```

5. **Verify the process is listening** on port 3014:
   ```powershell
   netstat -ano | findstr :3014
   ```

6. **Verify the root `web.config`** has the `bolt-value-summary` proxy rule (included above)

7. **Verify ARR is enabled** (see Prerequisites)

8. **Test the application:**
   - Dev: `https://boltdev.cadcollin.org/bolt-value-summary`
   - Prod: `https://bolt.cadcollin.org/bolt-value-summary`

---

## Available Pages

| URL Path | Description |
|----------|-------------|
| `/bolt-value-summary` | Home — app selection |
| `/bolt-value-summary/commercial-value-summary` | Commercial Value Summary |
| `/bolt-value-summary/summary-of-salient-facts` | Summary of Salient Facts |

---

## API Endpoints

All API requests are proxied by IIS through the root `web.config`. No additional proxy config is needed at the app level.

| Request Path | IIS Proxies To | Used By |
|-------------|----------------|---------|
| `/bolt-rest-engine/api/value-summaries/commercial` | `http://localhost:3006/bolt-rest-engine/...` | Commercial Value Summary, Summary of Salient Facts |
| `/bolt-value-summary/api/property-image` | `http://localhost:3014/bolt-value-summary/api/property-image` | Property image proxy (Next.js API route, reads UNC paths) |

---

## Process Management

The Node.js process must be running for the app to respond. If the process stops, IIS will return a **502 Bad Gateway**.

### BOLT Server (Recommended)

BOLT Server is a desktop application used to onboard, start, stop, restart, and install BOLT Next.js applications as Windows Services (via NSSM). It is the primary tool for managing this process in both dev and production environments.

**Onboarding values for BOLT Server:**

| Field | Value |
|-------|-------|
| Application Name | `BOLT Value Summary` |
| Application Path | `C:\inetpub\wwwroot\bolt\bolt-value-summary` |
| Port | `3014` |
| Health Check Endpoint | `/api/health` *(default)* |
| Log Folder | `C:\inetpub\wwwroot\bolt\bolt-value-summary\logs` *(default)* |

Once added, the application card in BOLT Server provides:
- **Start / Stop / Restart** — manually control the Node.js process
- **Install as Service** — installs the process as a Windows Service via NSSM so it starts automatically on server reboot

See `0_BOLT-SERVER-COMPATIBILITY.md` for full compatibility requirements (health endpoint, log format).

### Manual Start (fallback)

If BOLT Server is unavailable, the process can be started directly:

```bash
cd C:\inetpub\wwwroot\bolt\bolt-value-summary
node server.js
```

---

## Troubleshooting

### 502 Bad Gateway
- The Node.js process is not running — check BOLT Server or verify with `netstat -ano | findstr :3014`
- Restart the process from BOLT Server, or manually: `$env:PORT=3014; node server.js`

### 404 on all pages / assets not loading
- `basePath` is not set or mismatched in `next.config.ts` — rebuild with correct `basePath: "/bolt-value-summary"`
- The `public\` folder was not copied alongside `server.js`
- The `_next/static` folder was not copied into `.next\standalone\.next\static\`

### 404 on API requests (`/bolt-rest-engine/...`)
- Verify the `bolt-rest-engine` proxy rule is in the root `web.config`
- Verify the BOLT REST Engine process is running on port 3006

### `Cannot find module 'styled-jsx'` or `@swc/helpers` at runtime
- The pnpm virtual store was not flattened into `standalone/node_modules`
- This means `pnpm build` did not run `scripts/postbuild-standalone.mjs` — rebuild with `pnpm build`
- Do **not** run `node server.js` from inside `.next/standalone/` — always run from the deployment root

### `pdf.worker.min.mjs` 404
- Confirm `public\pdf.worker.min.mjs` was copied to the server alongside `server.js`
- If the file is present but still 404s, the `workerSrc` path is missing the basePath prefix — `GlobalWorkerOptions.workerSrc` must be set to `` `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf.worker.min.mjs` `` not `/pdf.worker.min.mjs`

### Theme not loading
- Confirm `public\themes\` was copied to the server

### Logo or image assets return 404 in components
- Symptom: `GET /android-chrome-192x192.png 404` (or any image served from `public/`)
- Cause: a raw `<img src="/image.png" />` tag is used — Next.js does not rewrite its `src`
- Fix: prefix `src` with `process.env.NEXT_PUBLIC_BASE_PATH` (see [Raw asset URLs must include the base path](#raw-asset-urls-must-include-the-base-path))
- **Do not use `next/image` `<Image>` as the fix** — in Next.js 16.x, `<Image unoptimized>` still omits the `basePath` prefix and the 404 persists; the env var prefix on a plain `<img>` is the correct approach

### `/_next/image?url=%2F...` returns 500
- Symptom: `GET /bolt-value-summary/_next/image?url=%2Fimage.png&w=48&q=75 500`
- Cause: `next/image` routes the image through its optimizer, which constructs the `url` query parameter without the `basePath` prefix
- Fix: switch back to a raw `<img>` with `src` prefixed by `process.env.NEXT_PUBLIC_BASE_PATH` — do not use `next/image` for static assets under a sub-path in this version

### PDF image assets return 404 (`@react-pdf/renderer`)
- Symptom: `GET https://domain.com/ccad-logo.png 404` or `GET https://domain.com/api/property-image?path=... 404` when generating a PDF
- Cause: `window.location.origin` returns only the domain — it does not include the `/bolt-value-summary` sub-path. Any URL built from origin alone will miss the sub-path prefix
- Fix: always construct image URLs as `` `${window.location.origin}${basePath}/...` `` where `basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""`
- This applies to both static assets (e.g. `ccad-logo.png`) and API-proxied images (e.g. `/api/property-image?path=...`)

### CSS / theme assets load from the wrong path (domain root instead of `/bolt-value-summary/`)
- Symptom: browser requests `https://domain/themes/usa.css` instead of `https://domain/bolt-value-summary/themes/usa.css`
- Cause: a `<link>` tag or `document.createElement("link")` uses a hardcoded absolute path like `/themes/foo.css` — Next.js does **not** rewrite these
- Fix: prefix with `process.env.NEXT_PUBLIC_BASE_PATH` and ensure `NEXT_PUBLIC_BASE_PATH=/bolt-value-summary` is in `.env.local` before building (see [Raw asset URLs must include the base path](#raw-asset-urls-must-include-the-base-path))

### Favicons, manifest, or PWA icons return 404
- Symptom: `GET /favicon-16x16.png 404`, `GET /site.webmanifest 404`, `GET /android-chrome-192x192.png 404`
- Cause: `metadata` `icons` / `manifest` in `app/layout.tsx` use bare paths like `/favicon.png` which resolve to the domain root, not the sub-path
- Fix: prefix all `metadata` icon URLs and the `manifest` value with `process.env.NEXT_PUBLIC_BASE_PATH` (see [Raw asset URLs must include the base path](#raw-asset-urls-must-include-the-base-path))
- Also fix `public/site.webmanifest` — its `src` values are static and must hardcode the full sub-path (e.g. `/bolt-value-summary/android-chrome-192x192.png`)

### `link rel="preload"` warning in the browser console
- Symptom: `The resource .../themes/default.css was preloaded using link preload but not used within a few seconds from the window's load event`
- Cause: a `<link rel="preload">` tag targets a theme CSS file, but the theme provider injects the stylesheet client-side after the load event — the browser never sees a matching consumer for the preload
- Fix: remove the `<link rel="preload">` tag from `app/layout.tsx`; the theme provider loads the CSS on its own

### `HTTP_X_REMOTE_USER` not received
- Verify the `serverVariables` block is present in the root `web.config` proxy rule
- ARR must be allowed to set server variables: in IIS Manager → URL Rewrite → View Server Variables → add `HTTP_X_REMOTE_USER`
