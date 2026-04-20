---
title: "serve"
description: "Start the local web UI for your knowledge base"
date: 2026-04-15
category: commands
tags: [serve, command, cli, web, ui]
---

# serve

Start the **local web UI** (Hono + HTMX) for your active knowledge base — wiki, search, ask, compile, stats, settings, and ingest.

```bash
theora serve
theora serve -p 8080
```

By default the startup banner shows **localhost** and your **KB root**.

Use **`--share`** when you want to open the app from another device on the same Wi‑Fi: the banner also lists **LAN URLs**, prints a **terminal QR code** (for the first IPv4 address), and reminds you about **Safari on iOS** blocking some plain `http://` pages unless you adjust **Settings → Safari → Privacy & Security → Not Secure Connection Warning**.

```bash
theora serve --share
```

## HTTP vs HTTPS

`theora serve` listens for **unencrypted HTTP** only (`http://` on localhost or your LAN IP). That is normal for local development: no TLS certificates, no browser padlock. **HTTPS** adds TLS so traffic is encrypted and browsers treat the site as "secure"; mobile Safari in particular may refuse or hassle plain **HTTP** on LAN IPs when stricter privacy settings are on. Theora does not terminate HTTPS inside `serve`; for encryption you either put a reverse proxy in front of the app or use a tunnel (below).

**Tip — tunnels for real HTTPS.** To open the wiki from a phone without fighting HTTP-only policies, run **`theora serve`** (or `theora serve -p <port>`) and expose it with a tunnel that gives you an **`https://…`** URL, for example **[ngrok](https://ngrok.com/)** (`ngrok http 4000`), **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)** (`cloudflared tunnel --url http://localhost:4000`), or similar. Point the tunnel at the same host and port Theora uses; share that HTTPS link or QR from the tunnel tool instead of the LAN QR from `--share`. Remember: anyone with the tunnel URL can reach your server unless the product adds access control — treat it like exposing a dev server.

## Options

| Option | Meaning |
| ------ | ------- |
| `-p, --port <port>` | TCP port to listen on (default **`4000`**). |
| `--share` | Show LAN URLs, QR code, and Safari tips for phone / tablet access on your network. |
