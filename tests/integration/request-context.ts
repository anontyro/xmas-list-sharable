// Stand-in for next/headers so server actions can run under Vitest.
// Use in a test file: vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
export const cookieJar = new Map<string, string>();
export const requestHeaders = new Map<string, string>();

export const nextHeadersMock = {
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => ({ get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null }),
};

export function resetRequest() {
  cookieJar.clear();
  requestHeaders.clear();
}
