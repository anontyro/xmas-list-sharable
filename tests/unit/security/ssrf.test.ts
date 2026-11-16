import { describe, expect, it } from "vitest";
import { isLoopback, isPublicAddress } from "@/lib/security/ssrf";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1", "127.255.255.254", "10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "169.254.0.1", "100.64.0.1", "100.127.255.255", "0.0.0.0", "0.1.2.3", "192.0.0.1", "198.18.0.1",
    "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    "::", "::1", "fd00::1", "fc00::1", "fe80::1", "ff02::1", "2001:db8::1", "64:ff9b::7f00:1", "2002:7f00:1::1",
    "::127.0.0.1", "::7f00:1", "0:0:0:0:0:0:7f00:1", "2001:0:4136:e378:8000:63bf:3fff:fdd2", "fec0::1", "100::1",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "0:0:0:0:0:ffff:192.168.0.1",
  ])("refuses %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["93.184.216.34", "8.8.8.8", "1.1.1.1", "172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "::ffff:808:808"])(
    "accepts %s",
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    },
  );

  it.each(["", "localhost", "example.com", "999.1.1.1", "1.2.3", "::gg", "0x7f.0.0.1", "2130706433"])("refuses a non-address: %j", (v) => {
    expect(isPublicAddress(v)).toBe(false);
  });

  it("knows what loopback is", () => {
    expect(isLoopback("127.0.0.1")).toBe(true);
    expect(isLoopback("::1")).toBe(true);
    expect(isLoopback("10.0.0.1")).toBe(false);
  });
});
