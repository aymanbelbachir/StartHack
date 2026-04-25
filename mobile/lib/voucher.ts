// ECDSA P-256 proof-of-payment system — Web Crypto API, zero dependencies
// Convention: hotel generates key pair, shares public key with Jungfrau Park server
// Hotel signs reservation → gives proof of payment (.md) to guest
// App extracts JFP-PROOF token from .md, verifies ECDSA signature

export interface ReservationData {
  client: string;     // guest full name
  hotel: string;      // hotel display name
  hotelId: string;    // partner ID
  chambre: string;
  checkIn: string;    // ISO date YYYY-MM-DD
  checkOut: string;   // ISO date YYYY-MM-DD
  nights: number;
  montant: number;    // amount paid in fiat (e.g. 450)
  devise: string;     // currency (e.g. CHF)
  tokens: number;     // token credit loaded to guest wallet
  exp: number;        // unix ms — when this proof expires
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

// ─── sign (hotel side) ────────────────────────────────────────────────────────
export async function signProof(data: ReservationData, privJwk: JsonWebKey): Promise<string> {
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

// ─── generate .md proof of payment ───────────────────────────────────────────
export function generateProofMD(data: ReservationData, proofToken: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `# 🏔 Jungfrau Pass — Preuve de Paiement

| | |
|---|---|
| **Client** | ${data.client} |
| **Hôtel** | ${data.hotel} |
| **Chambre** | ${data.chambre} |
| **Arrivée** | ${data.checkIn} |
| **Départ** | ${data.checkOut} |
| **Durée** | ${data.nights} nuit${data.nights > 1 ? 's' : ''} |
| **Montant réglé** | ${data.montant} ${data.devise} |
| **Tokens Jungfrau Pass** | ${data.tokens} 🪙 |
| **Émis le** | ${today} |

---

> La carte Jungfrau Pass associée est valable **uniquement pendant le séjour**
> du **${data.checkIn}** au **${data.checkOut}**.
> Les tokens ne peuvent être utilisés qu'au sein du complexe Jungfrau Park pendant cette période.

---

*Signé cryptographiquement par ${data.hotel} · ECDSA P-256*
*Vérifiable par le complexe Jungfrau Park sans connexion à l'hôtel*

<!-- JFP-PROOF:${proofToken} -->
`;
}

// ─── extract JFP-PROOF token from .md or plain text ──────────────────────────
export function extractProofToken(text: string): string | null {
  // Match <!-- JFP-PROOF:xxx --> or plain JFP-PROOF:xxx
  const match = text.match(/JFP-PROOF:([A-Za-z0-9+/=.]+)/);
  return match ? match[1] : null;
}

// ─── verify (app / Jungfrau Park complex) ─────────────────────────────────────
export async function verifyProof(
  proofToken: string,
  pubB64: string,
): Promise<{ valid: boolean; data: ReservationData | null; error?: string }> {
  try {
    const parts = proofToken.trim().split('.');
    if (parts.length !== 2) return { valid: false, data: null, error: 'Format invalide' };
    const [payload, sigB64] = parts;

    const data: ReservationData = JSON.parse(atob(payload));
    if (data.exp < Date.now()) return { valid: false, data: null, error: 'Preuve expirée' };

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

    return { valid, data: valid ? data : null, error: valid ? undefined : 'Signature invalide — preuve falsifiée' };
  } catch (e: any) {
    return { valid: false, data: null, error: e.message ?? 'Erreur crypto' };
  }
}

// ─── stay validity check ──────────────────────────────────────────────────────

// Parses ISO ("2026-04-20") or long-format ("Sunday, 20 April 2026") dates
function parseStayDate(str: string): Date {
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;
  const m = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) return new Date(`${m[2]} ${m[1]}, ${m[3]}`);
  return new Date(NaN);
}

export function isStayActive(checkIn: string, checkOut: string): boolean {
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  const start = parseStayDate(checkIn);
  const end   = parseStayDate(checkOut);
  return now >= start && now <= end;
}

export function stayStatus(checkIn: string, checkOut: string): { active: boolean; label: string; daysLeft: number } {
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  const start = parseStayDate(checkIn);
  const end   = parseStayDate(checkOut);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { active: false, label: 'Dates invalides', daysLeft: 0 };
  if (now < start) return { active: false, label: `Séjour commence le ${checkIn}`, daysLeft: 0 };
  if (now > end)   return { active: false, label: 'Séjour terminé', daysLeft: 0 };
  return { active: true, label: daysLeft === 1 ? 'Dernier jour du séjour' : `${daysLeft} jours restants`, daysLeft };
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
  // Local fallback: pre-registered demo public keys
  const { DEMO_HOTEL } = await import('@/data/demoVoucher');
  if (hotelId === DEMO_HOTEL.id) return DEMO_HOTEL.pubB64;
  return null;
}
