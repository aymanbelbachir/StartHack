# JungfrauPass

> **Your Alps. One Tap.**

[![JungfrauPass Demo Video](https://placehold.co/800x450/202020/FFFFFF.png?text=Play+Demo+Video)](https://drive.google.com/file/d/1NvBseUCMbsd0f-StBzOr5uzaAcf0dQLF/view?usp=sharing)

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

```text
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
