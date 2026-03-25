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

# API base URL — leave empty in production (IIS proxies /bolt-rest-engine/* locally)
NEXT_PUBLIC_API_BASE_URL=
```

> `NEXT_PUBLIC_API_BASE_URL` is empty in production. The app makes relative requests to `/bolt-rest-engine/api/...` which IIS proxies to `http://localhost:3006/bolt-rest-engine/...` via the existing root `web.config` rule.

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

### Theme not loading
- Confirm `public\themes\` was copied to the server

### `HTTP_X_REMOTE_USER` not received
- Verify the `serverVariables` block is present in the root `web.config` proxy rule
- ARR must be allowed to set server variables: in IIS Manager → URL Rewrite → View Server Variables → add `HTTP_X_REMOTE_USER`
