import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

export interface UrlSafetyResult {
  isSafe: boolean;
  reason?: string;
  normalizedUrl?: string;
  resolvedIp?: string;
}

const PRIVATE_IP_RANGES = [
  /^127\./,                         // 127.0.0.0/8 Loopback
  /^10\./,                          // 10.0.0.0/8 Private
  /^192\.168\./,                    // 192.168.0.0/16 Private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 Private
  /^169\.254\./,                    // 169.254.0.0/16 Link-local / Cloud metadata (AWS, GCP, Azure)
  /^0\./,                           // 0.0.0.0/8
  /^::1$/,                          // IPv6 Loopback
  /^fc00:/i,                        // IPv6 Unique local
  /^fe80:/i,                        // IPv6 Link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
  'docker.for.mac.localhost',
  'docker.for.win.localhost',
];

export async function validateSafeUrl(rawUrl: string): Promise<UrlSafetyResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, reason: 'URL string is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err: any) {
    return { isSafe: false, reason: `Malformed URL: ${err.message}` };
  }

  // 1. Strict protocol validation: only HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isSafe: false,
      reason: `Disallowed protocol scheme: "${parsed.protocol}". Only "http:" and "https:" are permitted.`
    };
  }

  // 2. Reject credentials in URL (e.g. http://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return { isSafe: false, reason: 'URLs containing embedded credentials are prohibited.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Blocked hostnames check
  if (BLOCKED_HOSTNAMES.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return {
      isSafe: false,
      reason: `Blocked target host "${hostname}". Navigation to internal or metadata domains is prohibited.`
    };
  }

  // 4. Check for raw IP address against private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return {
        isSafe: false,
        reason: `Target IP address "${hostname}" belongs to a prohibited private, loopback, or metadata range.`
      };
    }
  }

  // 5. DNS Resolution check to prevent DNS rebinding to private IPs
  try {
    const lookup = await lookupAsync(hostname);
    const resolvedIp = lookup.address;

    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(resolvedIp)) {
        return {
          isSafe: false,
          reason: `Resolved IP "${resolvedIp}" for host "${hostname}" belongs to a prohibited private network range.`,
          resolvedIp
        };
      }
    }

    return {
      isSafe: true,
      normalizedUrl: parsed.toString(),
      resolvedIp
    };
  } catch (dnsErr: any) {
    return {
      isSafe: false,
      reason: `DNS resolution failed for hostname "${hostname}": ${dnsErr.message}`
    };
  }
}
