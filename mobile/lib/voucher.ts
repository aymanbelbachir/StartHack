// ECDSA P-256 voucher system — Web Crypto API, zero dependencies
// Convention: hotel generates key pair, shares public key with Jungfrau Park server
// Hotel signs reservation → gives voucher to guest
// App verifies voucher using hotel's public key (from Firestore / convention)

export interface ReservationData {
  client: string;      // guest full name
  hotel: string;       // hotel display name
  hotelId: string;     // partner ID (e.g. 'partner-eiger')
  chambre: string;
  checkIn: string;     // ISO date
  checkOut: string;    // ISO date
  nights: number;
  tokens: number;      // token credit loaded to guest wallet
  exp: number;         // unix ms expiry
}

// ─── key generation (hotel, one-time at login) ────────────────────────────────
export async function generateHotelKeyPair(): Promise<{ privJwk: JsonWebKey; pubB64: string }> {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubSpki  = await crypto.subtle.exportKey('spki', kp.publicKey);
  const pubB64   = btoa(String.fromCharCode(...new Uint8Array(pubSpki)));
  return { privJwk, pubB64 };
}

// ─── sign (hotel, when creating a guest voucher) ──────────────────────────────
export async function signVoucher(data: ReservationData, privJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey(
    'jwk', privJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
  const payload = btoa(JSON.stringify(data));
  const sig     = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

// ─── verify (app / Jungfrau Park complex) ─────────────────────────────────────
export async function verifyVoucher(
  voucher: string,
  pubB64: string,
): Promise<{ valid: boolean; data: ReservationData | null; error?: string }> {
  try {
    const parts = voucher.trim().split('.');
    if (parts.length !== 2) return { valid: false, data: null, error: 'Format invalide' };
    const [payload, sigB64] = parts;

    const data: ReservationData = JSON.parse(atob(payload));
    if (data.exp < Date.now()) return { valid: false, data: null, error: 'Voucher expiré' };

    const pubBytes = Uint8Array.from(atob(pubB64), c => c.charCodeAt(0));
    const pubKey   = await crypto.subtle.importKey(
      'spki', pubBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify'],
    );

    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey, sigBytes,
      new TextEncoder().encode(payload),
    );

    return { valid, data: valid ? data : null, error: valid ? undefined : 'Signature invalide — bon falsifié' };
  } catch (e: any) {
    return { valid: false, data: null, error: e.message ?? 'Erreur crypto' };
  }
}

// ─── fetch hotel public key (Firestore first, demo fallback) ─────────────────
export async function getHotelPublicKey(hotelId: string): Promise<string | null> {
  try {
    const { FIREBASE_CONFIGURED, db } = await import('@/lib/firebase');
    if (FIREBASE_CONFIGURED && db) {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'hotels', hotelId));
      if (snap.exists()) return snap.data().pubB64 ?? null;
    }
  } catch {}

  // Local fallback: use pre-registered demo public keys
  const { DEMO_HOTEL } = await import('@/data/demoVoucher');
  if (hotelId === DEMO_HOTEL.id) return DEMO_HOTEL.pubB64;
  return null;
}
