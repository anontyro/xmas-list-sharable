import { BlockList, isIP } from "node:net";

// Addresses a server-side fetch must never reach: private, loopback, link-local (incl. cloud metadata at
// 169.254.169.254), carrier-grade NAT, multicast, documentation and other reserved ranges.
const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 96], // unspecified, loopback and the deprecated IPv4-compatible range (::127.0.0.1)
  ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8], ["2001:db8::", 32], ["100::", 64],
  ["2001::", 32], // Teredo embeds an IPv4 address
  ["64:ff9b::", 96], // NAT64 and 6to4 embed an IPv4 address, so are refused outright
  ["2002::", 16],
] as const) blocked.addSubnet(net, bits, "ipv6");

/** The IPv4 address hidden inside an IPv4-mapped IPv6 address (::ffff:a.b.c.d or ::ffff:7f00:1), if any. */
function mappedV4(ip: string): string | null {
  const dotted = /^(?:0{0,4}:){0,5}ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (dotted) return dotted[1];
  const hex = /^(?:0{0,4}:){0,5}ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (!hex) return null;
  const [hi, lo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** 127.0.0.0/8 and ::1. Tests are allowed to reach these (see safe-fetch), nothing else. */
export const isLoopback = (ip: string) => ip.startsWith("127.") || ip === "::1";

/** True only for a syntactically valid IP that is not in any blocked range. Anything else is refused. */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return false;
  if (family === 6) {
    const v4 = mappedV4(ip);
    if (v4) return isPublicAddress(v4);
  }
  return !blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}
