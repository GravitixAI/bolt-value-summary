# BOLT IIS Setup Guide

This guide covers the one-time IIS configuration required on any Windows Server that will host BOLT Node.js applications behind IIS as a reverse proxy.

---

## Prerequisites

Install the following IIS modules before proceeding:

- **URL Rewrite Module** — https://www.iis.net/downloads/microsoft/url-rewrite
- **Application Request Routing (ARR)** — https://www.iis.net/downloads/microsoft/application-request-routing

---

## 1. Enable ARR Proxy

ARR must be enabled at the server level before any reverse proxy rules will work.

1. Open **IIS Manager**
2. Select the **server node** (top of the tree, not a site)
3. Double-click **Application Request Routing Cache**
4. In the Actions pane, click **Server Proxy Settings**
5. Check **Enable proxy**
6. Click **Apply**

---

## 2. Allow Server Variables

URL Rewrite rules that set server variables (e.g. `HTTP_X_REMOTE_USER`) must have each variable explicitly allowed at the server level. IIS blocks unknown server variables by default.

### Steps

1. Open **IIS Manager**
2. Select the **server node**
3. Double-click **URL Rewrite**
4. In the Actions pane, click **View Server Variables**
5. Add each of the following variables:

| Variable | Purpose |
|----------|---------|
| `HTTP_X_REMOTE_USER` | Forwards the authenticated Windows username (`{LOGON_USER}`) to the Node.js process |
| `HTTP_X_FORWARDED_HOST` | Forwards the original `Host` header through the reverse proxy |
| `HTTP_X_FORWARDED_PREFIX` | Forwards the sub-path prefix (e.g. `/bolt-value-summary`) to the Node.js process |
| `HTTP_X_FORWARDED_PROTO` | Forwards the original protocol (`https`) so the Node.js process knows the request came in over SSL |

> These variables only need to be added once at the server level. They apply to all sites and applications on the server.

### Why each variable is needed

- **`HTTP_X_REMOTE_USER`** — Set from `{LOGON_USER}` in each proxy rule's `<serverVariables>` block. Delivers the authenticated Windows identity to the Node.js app without requiring the app to implement Windows Auth directly.
- **`HTTP_X_FORWARDED_HOST`** — Preserves the original domain (`bolt.cadcollin.org`) after ARR rewrites the request to `localhost`. Without it, the Node.js app sees `localhost` as the host.
- **`HTTP_X_FORWARDED_PREFIX`** — Communicates the sub-path prefix to the app. Useful for apps that need to know what path they are mounted at.
- **`HTTP_X_FORWARDED_PROTO`** — IIS terminates SSL and forwards plain HTTP to Node.js. Without this header, the Node.js app cannot tell whether the original request was HTTP or HTTPS.

---
