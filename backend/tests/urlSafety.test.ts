import { validateSafeUrl } from '../src/services/browser-automation/urlSafety';

describe('URL Safety & Anti-SSRF Validator', () => {
  it('should accept valid public HTTPS URLs', async () => {
    const result = await validateSafeUrl('https://example.com/careers/apply');
    expect(result.isSafe).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/careers/apply');
  });

  it('should reject localhost', async () => {
    const result = await validateSafeUrl('http://localhost:8080/secret');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('Blocked target host "localhost"');
  });

  it('should reject loopback 127.0.0.1 IP', async () => {
    const result = await validateSafeUrl('http://127.0.0.1:3000/internal');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('prohibited private, loopback, or metadata range');
  });

  it('should reject AWS / Cloud metadata address 169.254.169.254', async () => {
    const result = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('Blocked target host "169.254.169.254"');
  });

  it('should reject private RFC 1918 10.x.x.x addresses', async () => {
    const result = await validateSafeUrl('http://10.0.0.5:8000/api');
    expect(result.isSafe).toBe(false);
  });

  it('should reject non-HTTP/HTTPS schemes like file: or javascript:', async () => {
    const result = await validateSafeUrl('file:///etc/passwd');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('Disallowed protocol scheme: "file:"');
  });

  it('should reject URLs with embedded credentials', async () => {
    const result = await validateSafeUrl('http://admin:secret@example.com');
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('embedded credentials');
  });
});
