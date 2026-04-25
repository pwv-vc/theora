import { resolve } from "node:path";
import pc from "picocolors";
import { listLanIPv4 } from "./serve-listen.js";
import { DEFAULT_SERVE_PORT, SERVE_PORT_ENV, DEFAULT_MCP_PORT, MCP_PORT_ENV } from "./config.js";

export async function printServeListenBanner(options: {
  port: number;
  kbRoot?: string;
  kbName?: string;
  /** LAN URLs, QR code, and Safari HTTP tips for phones / tablets on your network */
  share?: boolean;
}): Promise<void> {
  const { port, kbRoot, kbName, share = false } = options;
  const localhostUrl = `http://localhost:${port}`;

  console.log();
  console.log(`${pc.bold(pc.magenta("Theora"))} ${pc.gray("web server")}`);
  console.log();
  console.log(
    `  ${pc.green("●")} ${pc.bold("Local")}    ${pc.cyan(localhostUrl)}`,
  );

  let lanIps: string[] = [];
  if (share) {
    lanIps = listLanIPv4();
    if (lanIps.length > 0) {
      for (const ip of lanIps) {
        console.log(
          `  ${pc.green("●")} ${pc.bold("Network")}  ${pc.cyan(`http://${ip}:${port}`)}`,
        );
      }
      if (lanIps.length > 1) {
        console.log(
          pc.gray(
            `            (${lanIps.length} addresses — QR uses ${lanIps[0]})`,
          ),
        );
      }
    } else {
      console.log(
        `  ${pc.yellow("○")} ${pc.bold("Network")}  ${pc.gray("no LAN IPv4 (join Wi‑Fi / Ethernet for phone access)")}`,
      );
    }
  }

  if (kbRoot) {
    console.log();
    if (kbName) {
      console.log(
        `${pc.gray("Serving")} ${pc.cyan(kbName)} ${pc.gray("from")} ${pc.cyan(kbRoot)} ...`,
      );
    } else {
      console.log(`${pc.gray("KB root")} ${pc.dim(kbRoot)}`);
    }
  }

  if (share) {
    console.log();
    if (lanIps.length > 0) {
      const qrUrl = `http://${lanIps[0]}:${port}`;
      console.log(
        `${pc.bold("Phone / tablet")} ${pc.gray("scan to open on your network")}`,
      );
      console.log(pc.dim(`  ${qrUrl}`));
      console.log();
      try {
        const QRCode = (await import("qrcode")).default;
        const qr = await QRCode.toString(qrUrl, {
          type: "terminal",
          small: true,
        });
        console.log(qr);
      } catch {
        console.log(
          pc.yellow("  Could not render a QR code in this terminal."),
        );
      }
    }

    console.log();
    console.log(
      pc.gray(
        "Safari (iOS): “HTTP URL with HTTPS-Only” → Settings → Safari → Privacy & Security →",
      ),
    );
    console.log(
      pc.gray(
        "  turn off Not Secure Connection Warning for local http:// (or use Chrome).",
      ),
    );
  }

  // MCP endpoint info
  const mcpUrl = `${localhostUrl}/mcp`;
  console.log(
    `  ${pc.green("●")} ${pc.bold("MCP")}      ${pc.cyan(mcpUrl)}`,
  );

  // Copy-paste config for Cursor / Claude Desktop
  const mcpBinPath = resolve(
    kbRoot ?? process.cwd(),
    "node_modules",
    ".bin",
    "theora-mcp",
  );
  const distMcpPath = resolve(
    kbRoot ?? process.cwd(),
    "dist",
    "mcp",
    "index.js",
  );

  console.log();
  console.log(
    `${pc.bold(pc.magenta("MCP"))} ${pc.gray("agent config — add to")} ${pc.cyan(".cursor/mcp.json")} ${pc.gray("or Claude Desktop:")}`,
  );
  console.log();
  console.log(pc.gray("  Stdio (recommended for Cursor):"));
  console.log(
    pc.dim(
      `  {\n    "mcpServers": {\n      "${kbName ? slugifyBannerName(kbName) : "theora"}": {\n        "command": "node",\n        "args": ["${distMcpPath}"]\n      }\n    }\n  }`,
    ),
  );
  console.log();
  console.log(pc.gray("  Streamable HTTP (remote clients):"));
  console.log(pc.dim(`  MCP endpoint: ${mcpUrl}`));

  console.log();
  console.log(
    pc.gray("Port config:") +
    pc.dim(` serve=${port} (--port, ${SERVE_PORT_ENV} env, config servePort, default ${DEFAULT_SERVE_PORT})`) +
    pc.dim(` | mcp=embedded at /mcp (standalone: --port, ${MCP_PORT_ENV} env, config mcpPort, default ${DEFAULT_MCP_PORT})`),
  );
  console.log();
  console.log(pc.gray("Press Ctrl+C to stop"));
}

function slugifyBannerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "theora";
}
