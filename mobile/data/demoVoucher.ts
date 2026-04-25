// Pre-generated demo voucher for testing the ECDSA flow
// Private key is for demo ONLY — in production, never stored in the codebase

export const DEMO_HOTEL = {
  id: 'partner-jungfraujoch',
  name: 'Hotel Eiger',

  // Public key (SPKI base64) — this is what Jungfrau Park registers in Firestore
  pubB64: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYqyA5vfqdA1NjgX1BtCwVPQdO5jt9AW0RU1ELD8W+bHg2efAMyFPyrcW0/g4b7xD4vtkyueM12jClZEG4aIRXw==',

  // Private key JWK — for the partner app (hotel side) only
  privJwk: {
    key_ops: ['sign'], ext: true, kty: 'EC',
    x: 'YqyA5vfqdA1NjgX1BtCwVPQdO5jt9AW0RU1ELD8W-bE',
    y: '4NnnwDMhT8q3FtP4OG-8Q-L7ZMrnjNdowpWRBuGiEV8',
    crv: 'P-256',
    d: 'nbBS7awHr_1cvaERyxpXK1roeBu1kLb1-0V73cnDT-Y',
  } as JsonWebKey,
};

// Alice Dupont · 3 nights · 450 CHF · 150 tokens · stay 2026-05-01→04 · expires 2026-05-25
export const DEMO_VOUCHER =
  'eyJjbGllbnQiOiJBbGljZSBEdXBvbnQiLCJob3RlbCI6IkhvdGVsIEVpZ2VyIiwiaG90ZWxJZCI6InBhcnRuZXItanVuZ2ZyYXVqb2NoIiwiY2hhbWJyZSI6IjIwNCIsImNoZWNrSW4iOiIyMDI2LTA1LTAxIiwiY2hlY2tPdXQiOiIyMDI2LTA1LTA0IiwibmlnaHRzIjozLCJtb250YW50Ijo0NTAsImRldmlzZSI6IkNIRiIsInRva2VucyI6MTUwLCJleHAiOjE3Nzk3MTE3OTA5Mjl9.2Scj+6dpwyv+HBphbD5+aSNpW6aNcyDx5HSU1As38lZbCCJ8NgJy34EmkiYj1MYvNG5g/ALFhF11IatJbIMsFA==';

// Full .md proof of payment — paste this entire block to test the extraction flow
export const DEMO_PROOF_MD = `# 🏔 Jungfrau Pass — Preuve de Paiement

| | |
|---|---|
| **Client** | Alice Dupont |
| **Hôtel** | Hotel Eiger |
| **Chambre** | 204 |
| **Arrivée** | 2026-05-01 |
| **Départ** | 2026-05-04 |
| **Durée** | 3 nuits |
| **Montant réglé** | 450 CHF |
| **Tokens Jungfrau Pass** | 150 🪙 |
| **Émis le** | 2026-04-25 |

---

> La carte Jungfrau Pass associée est valable **uniquement pendant le séjour**
> du **2026-05-01** au **2026-05-04**.
> Les tokens ne peuvent être utilisés qu'au sein du complexe Jungfrau Park pendant cette période.

---

*Signé cryptographiquement par Hotel Eiger · ECDSA P-256*
*Vérifiable par le complexe Jungfrau Park sans connexion à l'hôtel*

<!-- JFP-PROOF:eyJjbGllbnQiOiJBbGljZSBEdXBvbnQiLCJob3RlbCI6IkhvdGVsIEVpZ2VyIiwiaG90ZWxJZCI6InBhcnRuZXItanVuZ2ZyYXVqb2NoIiwiY2hhbWJyZSI6IjIwNCIsImNoZWNrSW4iOiIyMDI2LTA1LTAxIiwiY2hlY2tPdXQiOiIyMDI2LTA1LTA0IiwibmlnaHRzIjozLCJtb250YW50Ijo0NTAsImRldmlzZSI6IkNIRiIsInRva2VucyI6MTUwLCJleHAiOjE3Nzk3MTE3OTA5Mjl9.2Scj+6dpwyv+HBphbD5+aSNpW6aNcyDx5HSU1As38lZbCCJ8NgJy34EmkiYj1MYvNG5g/ALFhF11IatJbIMsFA== -->
`;
