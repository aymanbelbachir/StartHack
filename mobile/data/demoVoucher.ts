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

// Ready-to-paste voucher: Alice Dupont | 3 nights | 150 tokens | expires 25 May 2026
export const DEMO_VOUCHER =
  'eyJjbGllbnQiOiJBbGljZSBEdXBvbnQiLCJob3RlbCI6IkhvdGVsIEVpZ2VyIiwiaG90ZWxJZCI6InBhcnRuZXItanVuZ2ZyYXVqb2NoIiwiY2hhbWJyZSI6IjIwNCIsImNoZWNrSW4iOiIyMDI2LTA1LTAxIiwiY2hlY2tPdXQiOiIyMDI2LTA1LTA0IiwibmlnaHRzIjozLCJ0b2tlbnMiOjE1MCwiZXhwIjoxNzc5NzEwOTc2MDU1fQ==.b2GRqfq68cU+AM7ygOMB1Lczw71H6zuvs0EIylg9uI+Jh48Cexi/gKJiZYdwHbkqNcLhfkNunQydhtAV+vD5eg==';
