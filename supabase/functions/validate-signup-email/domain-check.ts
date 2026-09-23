type DnsAnswer = { type?: number; data?: string };
type DnsResponse = { Status?: number; Answer?: DnsAnswer[] };

async function queryDns(domain: string, type: "MX" | "A" | "AAAA", fetcher: typeof fetch): Promise<DnsResponse> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("DNS lookup failed");
  return await response.json() as DnsResponse;
}

export async function canReceiveEmail(domain: string, fetcher: typeof fetch = fetch) {
  const mx = await queryDns(domain, "MX", fetcher);
  if (mx.Status === 3) return false;
  if (mx.Status !== 0) throw new Error("DNS lookup failed");
  const mxRecords = (mx.Answer ?? []).filter((answer) => answer.type === 15);
  if (mxRecords.some((answer) => answer.data?.trim() === "0 .")) return false;
  if (mxRecords.length > 0) return true;

  // SMTP permits address-record fallback when a domain publishes no MX record.
  const [ipv4, ipv6] = await Promise.all([queryDns(domain, "A", fetcher), queryDns(domain, "AAAA", fetcher)]);
  return [ipv4, ipv6].some((result) => result.Status === 0 && (result.Answer ?? []).some((answer) => answer.type === 1 || answer.type === 28));
}
