import { networkInterfaces } from 'node:os'

function isPublicIPv4(family: string | number): boolean {
  return family === 'IPv4' || family === 4
}

/** Non-loopback IPv4 addresses suitable for LAN URLs. */
export function listLanIPv4(): string[] {
  const nets = networkInterfaces()
  const out: string[] = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (isPublicIPv4(net.family) && !net.internal) out.push(net.address)
    }
  }
  return [...new Set(out)]
}
