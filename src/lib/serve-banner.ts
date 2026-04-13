import pc from "picocolors";
import { listLanIPv4 } from './serve-listen.js'

export async function printServeListenBanner(options: {
  port: number;
  kbRoot?: string;
  /** LAN URLs, QR code, and Safari HTTP tips for phones / tablets on your network */
  share?: boolean;
}): Promise<void> {
  const { port, kbRoot, share = false } = options;
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
    console.log(`${pc.gray("KB root")} ${pc.dim(kbRoot)}`);
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
        console.log(pc.yellow("  Could not render a QR code in this terminal."));
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

  console.log();
  console.log(pc.gray("Press Ctrl+C to stop"));
}
