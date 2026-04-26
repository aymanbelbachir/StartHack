# JungfrauPass

> **Your Alps. One Tap.**

JungfrauPass is a digital guest wallet built for the Jungfrau Region. It replaces fragmented paper vouchers and high-fee foreign card payments with a single mobile app — one wallet, every benefit, every partner, every activity in the region.

Built in 24 hours at START Hack Tour · Interlaken · April 24–26, 2026.

---

## What it does

**For guests**
- Activate your pass by uploading your hotel invoice — the app parses it automatically and loads tokens based on your number of nights
- Pay at any partner by scanning their QR code — instant token transfer, zero card fees
- Redeem pre-loaded benefits (free railway ticket, restaurant discounts, bike rental, bus pass) with one-time cryptographic enforcement
- Browse and book activities pulled live from the official Jungfrau Region marketplace
- Explore the region through a quest system — discover landmarks, earn tokens, unlock hidden spots
- Top up your wallet with real CHF via Stripe (Apple Pay, Google Pay, and TWINT-ready)

**For partners**
- One screen, one QR code — fully operational in under two minutes
- Real-time payment notifications the moment a guest pays
- Zero per-transaction card processing fees — monthly flat settlement below 1%
- No terminal, no integration project, no training required

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo Router |
| Backend | Node.js / Express → deployable to Vercel |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth |
| Payments | Stripe Checkout (CHF, card / Apple Pay / Google Pay / TWINT) |
| Maps | react-native-maps |
| QR | expo-camera (scan) + react-native-qrcode-svg (generate) |
| Crypto | Web Crypto API — ECDSA P-256 proof-of-stay verification |

---

## Project structure

```
StartHack/
├── mobile/          # React Native / Expo app
│   ├── app/
│   │   ├── index.tsx              # Login / sign-up
│   │   ├── activate.tsx           # Invoice upload + stay activation
│   │   ├── role.tsx               # Partner login
│   │   ├── (guest)/               # Guest tab navigation
│   │   │   ├── index.tsx          # Map + quests + wallet sheet
│   │   │   ├── scan.tsx           # QR pay / redeem / book
│   │   │   ├── benefits.tsx       # Redeemable benefits catalog
│   │   │   ├── activities.tsx     # Activity discovery + reviews
│   │   │   ├── competition.tsx    # Photo contest
│   │   │   ├── topup.tsx          # Buy tokens via Stripe
│   │   │   ├── history.tsx        # Transaction history
│   │   │   └── profile.tsx        # Account + settings
│   │   └── (partner)/             # Partner dashboard
│   │       ├── index.tsx          # QR display + real-time payments
│   │       ├── bookings.tsx
│   │       ├── transactions.tsx
│   │       ├── confirm.tsx
│   │       └── account.tsx
│   ├── lib/
│   │   ├── firebase.ts            # Firestore config
│   │   ├── voucher.ts             # ECDSA proof-of-stay
│   │   └── parseInvoice.ts        # Invoice parsing + stay validation
│   └── data/
│       ├── activities.ts          # Activity catalogue (Jungfrau marketplace)
│       ├── benefits.ts            # Guest card entitlements
│       └── landmarks.ts           # Quest locations
└── backend/         # Express server
    └── server.js                  # Stripe checkout + invoice parsing endpoints
```

---

## Running locally

### Mobile app

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --tunnel
```

Scan the QR code with the Expo Go app on your phone.

### Backend

```bash
cd backend
npm install
# create a .env file with:
# STRIPE_SECRET_KEY=sk_test_...
node server.js
```

Set `EXPO_PUBLIC_BACKEND_URL` in `mobile/.env.local` to your backend URL.

---

## Key flows

**Stay activation**
Guest uploads hotel invoice (PDF or text) → backend parses check-in / check-out dates → ECDSA signature from hotel verified locally → tokens credited (10 per night).

**Token payment**
Guest scans partner QR → amount confirmed → Firestore atomic write deducts guest balance and credits partner → partner dashboard notified in real time.

**Stripe top-up**
Guest selects a token pack → Stripe Checkout opens in browser → payment confirmed server-side → tokens credited to Firestore wallet. Packs: 10 tokens / CHF 1.00 · 50 tokens / CHF 4.99 · 100 tokens / CHF 8.99.

**Fee reduction**
Traditional foreign card: 2–3.5% on every partner transaction. JungfrauPass: one Stripe fee on wallet top-up (~1.4% + CHF 0.25), then zero per-transaction fees inside the ecosystem. Partners pay a flat monthly settlement rate below 1%.

---

## Deployment

The backend is a standard Express app with `module.exports = app` — deploy to Vercel with a single `vercel.json` config file. The mobile app builds to iOS and Android via Expo EAS Build. Firebase Firestore is already cloud-hosted with no infrastructure to manage.

---

## Team

Built at START Hack 2026 — Interlaken, Switzerland.
