// UUIDv5: deterministic UUID derived from a name string.
// Same input always produces the same UUID — stable across exports.
// Namespace: DNS namespace UUID (standard, per RFC 4122).
const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/-/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uuidv5(name: string): Promise<string> {
  const nsBytes = hexToBytes(NAMESPACE);
  const nameBytes = new TextEncoder().encode(name);

  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest("SHA-1", input);
  const hash = new Uint8Array(hashBuffer);

  // Set version (5) in byte 6
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant bits in byte 8
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const h = bytesToHex(hash.slice(0, 16));
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
