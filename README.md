# Jungfrau Digital Wallet — Hackathon Project Plan
### START Hack Tour · Interlaken · April 24–26, 2026

---

## 1. Project Overview

**App name (suggestion):** JungfrauPass

**Core concept:** A mobile-first digital wallet that replaces the fragmented physical guest card system of the Jungfrau Region. Overnight guests get a single app that activates their entitlements on check-in, lets them pay with Jungfrau Tokens at partner stores, redeem one-time benefits, and earn discovery/sustainability Points.

**Two actors:**
- **Guest (User)** — tourist with an activated wallet
- **Partner (Store/Provider)** — restaurant, activity provider, mountain railway, hotel

---

## 2. Feature Scope (Hackathon MVP)

### Guest side
| Feature | Priority | Notes |
|---|---|---|
| Hotel check-in activation (mock code) | P0 | Unlocks wallet & entitlements |
| Token balance display | P0 | Main wallet screen |
| Points balance display | P0 | Alongside tokens |
| Scan partner QR → pay with tokens | P0 | Core transaction flow |
| Benefits list (one-time redeemable) | P0 | e.g. free train ride, 10% restaurant |
| Redeem benefit via QR | P0 | Marks benefit as used |
| Activity list (hardcoded) | P1 | Register → earn points |
| Map with landmarks (hardcoded) | P1 | Check in → earn points |
| Transaction history | P1 | Simple log |
| Activity discovery tab | P2 | Real activities pulled from official Jungfrau website |

### Partner side
| Feature | Priority | Notes |
|---|---|---|
| Static QR code display (their ID) | P0 | Used by guest to scan |
| Incoming transaction feed (real-time) | P0 | Live Firebase updates |
| Token balance | P0 | What the partner holds |
| Benefit redemption confirmation | P0 | Accept/reject incoming redemption |
| Daily summary | P1 | Total received, redemptions count |

---

## 3. Tech Stack

### Frontend — React + Next.js (TypeScript)
- **Why:** Fast to build two separate views (guest/partner), great component model, works on mobile browser without native app submission
- **Styling:** Tailwind CSS — utility classes, no custom CSS files, fast iteration
- **QR scanning:** `@zxing/library` (browser-based, no native permissions issues)
- **QR generation:** `qrcode.react` (for partner QR display)
- **Maps:** `react-leaflet` with OpenStreetMap (free, no API key needed)
- **Icons:** `lucide-react`
- **Animations:** Framer Motion (wallet transitions, payment confirmation)

### Backend & Database — Firebase
- **Firestore** (NoSQL real-time DB) — wallets, balances, transactions, benefits
- **Firebase Auth** — simple email/password or anonymous auth for demo
- **Firebase Realtime DB** — not needed, Firestore real-time listeners are enough
- **Why Firebase:** Real-time balance updates during demo, zero backend server to manage, free tier is sufficient, Firestore listeners make the partner dashboard update live when a guest pays

### Hosting — Vercel
- **Why:** Zero-config Next.js deployment, instant preview URLs, free tier, perfect for demo
- **Deploy:** `git push` → live in 30 seconds

### QR Flow — No hardware needed
- Partner has a screen showing their QR (just their Firebase store ID encoded)
- Guest opens app, taps "Pay" or "Redeem", camera opens, scans QR
- Transaction written to Firestore → both balances update in real-time

---

## 4. Data Model (Firestore)

```
/users/{userId}
  - name: string
  - email: string
  - hotelCode: string           // mock activation code
  - activatedAt: timestamp
  - tokenBalance: number        // Jungfrau Tokens (currency)
  - pointsBalance: number       // Reward points
  - checkInLocation: string     // current hotel/area

/partners/{partnerId}
  - name: string
  - type: string                // "restaurant" | "activity" | "transport"
  - location: { lat, lng }
  - tokenBalance: number
  - qrValue: string             // = partnerId (encoded in their QR)

/transactions/{txId}
  - fromUserId: string
  - toPartnerId: string
  - amount: number              // tokens
  - pointsAwarded: number
  - type: string                // "payment" | "benefit_redemption"
  - benefitId: string | null
  - timestamp: timestamp
  - status: string              // "pending" | "confirmed"

/benefits/{benefitId}           // hardcoded collection
  - title: string               // "Free Jungfraujoch discount"
  - description: string
  - partnerId: string
  - discountType: string        // "one_time" | "multi_use"
  - discountValue: number       // % or flat token amount
  - redeemedBy: string[]        // userIds who already redeemed

/activities/{activityId}        // hardcoded collection
  - title: string
  - description: string
  - location: string
  - pointsReward: number
  - registeredUsers: string[]
  - imageUrl: string

/landmarks/{landmarkId}         // hardcoded collection
  - title: string
  - description: string
  - coords: { lat, lng }
  - pointsReward: number
  - discoveredBy: string[]
```

---

## 5. App Structure (File/Folder)

```
jungfrau-wallet/
├── app/
│   ├── (guest)/
│   │   ├── page.tsx              # Wallet home — balances + quick actions
│   │   ├── scan/page.tsx         # QR scanner — pay or redeem
│   │   ├── benefits/page.tsx     # List of available benefits
│   │   ├── activities/page.tsx   # Hardcoded activities + register
│   │   ├── map/page.tsx          # Landmarks map + check-in
│   │   ├── history/page.tsx      # Transaction history
│   │   └── discover/page.tsx     # Real activities from official Jungfrau website
│   ├── (partner)/
│   │   ├── page.tsx              # Partner dashboard — balance + QR display
│   │   ├── transactions/page.tsx # Incoming transaction feed (real-time)
│   │   └── confirm/page.tsx      # Benefit redemption confirmation
│   ├── api/
│   │   ├── transact/route.ts     # POST — process token payment
│   │   ├── redeem/route.ts       # POST — redeem benefit
│   │   └── checkin/route.ts      # POST — landmark/activity check-in
│   └── layout.tsx
├── components/
│   ├── WalletCard.tsx
│   ├── QRScanner.tsx
│   ├── QRDisplay.tsx
│   ├── TransactionItem.tsx
│   ├── BenefitCard.tsx
│   └── ActivityCard.tsx
├── lib/
│   ├── firebase.ts               # Firebase init
│   └── firestore.ts              # DB helper functions
├── hooks/
│   ├── useWallet.ts              # Real-time balance listener
│   └── useTransactions.ts        # Real-time transaction listener
└── data/
    ├── activities.ts             # Hardcoded activities
    ├── landmarks.ts              # Hardcoded landmarks
    └── benefits.ts               # Hardcoded benefits
```

---

## 6. Key Implementation Details

### Activation Flow
1. Guest opens app → sees "Activate your wallet"
2. Enters hotel confirmation code (any valid code from a hardcoded list for demo)
3. Firestore user document created → `tokenBalance: 50` (loaded on arrival), `pointsBalance: 0`, list of entitled benefits linked
4. Wallet home screen unlocks

### Payment Flow (Token Transfer)
1. Guest taps "Pay at partner"
2. Camera opens → scans partner QR → resolves `partnerId`
3. App shows partner name + amount input
4. Guest confirms → API route `/api/transact` called
5. Firestore transaction:
   - Decrement `users/{userId}.tokenBalance`
   - Increment `partners/{partnerId}.tokenBalance`
   - Write transaction doc
   - Award points to user (+10 per transaction)
6. Partner dashboard updates in real-time via Firestore listener

### Benefit Redemption Flow
1. Guest taps a benefit → sees detail + "Redeem at partner" button
2. Camera opens → scans partner QR
3. API route `/api/redeem` validates:
   - Benefit not already redeemed by this user
   - QR matches the correct partner for this benefit
4. On success: `benefits/{id}.redeemedBy` array updated, transaction written
5. Partner sees redemption on their dashboard with an "Accept" button

### Points / Discovery Flow
1. Landmark map: guest taps a pin → "Check in here" button
2. GPS check (or just button tap for demo) → API route `/api/checkin`
3. Firestore: add userId to `landmarks/{id}.discoveredBy`, increment `users/{userId}.pointsBalance`
4. Activity registration: tap activity → "Register" → points awarded immediately + user added to registeredUsers

### Activity Discovery Flow
1. On app load, fetch activities from the official Jungfrau Region SwissActivities page
2. Parse and display: title, description, image, price, category
3. Guest taps "Register" on any activity → points awarded, user added to `registeredUsers` in Firestore
4. For demo: if the live fetch is flaky, fall back to a hardcoded JSON snapshot of the real activities scraped beforehand and stored in `/data/activities.ts`

**Scraping approach (prep before hackathon):**
- Hit `https://jungfrauregion.swiss/de/entdecken/marktplatz/tickets-und-aktivitaeten.html`
- Parse activity cards (title, image, price, category) into a static JSON file
- Use that as the data source in-app — no live scraping needed during demo, keeps it reliable

---

## 7. Hardcoded Demo Data

### Hotel codes (activation)
`HOTEL-VICTORIA`, `HOTEL-EIGER`, `HOTEL-ALPINA`

### Partners (mock)
- Grindelwald Bäckerei — food
- Jungfraujoch Railway — transport
- Interlaken Adventure Sports — activity
- Hotel Victoria Restaurant — restaurant

### Benefits (guest card entitlements)
- 1x Free Jungfraujoch railway ticket (one-time)
- 3x 10% off at partner restaurants (multi-use)
- 1x Free mountain bike rental (one-time)
- Unlimited free public bus in the region

### Activities (hardcoded, from SwissActivities)
- Paragliding Interlaken — 150 pts
- Eiger Trail Hike — 80 pts
- Grindelwald Glacier Walk — 60 pts
- Lake Thun Boat Tour — 50 pts

### Landmarks (discovery points)
- Jungfraujoch summit — 100 pts
- Grindelwald village — 40 pts
- Lauterbrunnen waterfall — 50 pts
- Lake Brienz viewpoint — 30 pts

---

## 8. Team Split (suggested for 3–4 people)

| Role | Responsibilities |
|---|---|
| **Frontend Lead** | Guest app UI — wallet, scanner, benefits, map |
| **Frontend / Partner** | Partner dashboard UI + QR display + real-time feed |
| **Backend / Firebase** | Firestore schema setup, API routes, transaction logic, auth |
| **Data + Integration** | Activity scraping/data prep, landmark data, demo data seeding, deployment |

Everyone shares: Vercel deployment, Firebase console access, shared GitHub repo.

---

## 9. Build Order / Timeline

### Friday evening (setup)
- [ ] Create Next.js app with TypeScript + Tailwind
- [ ] Set up Firebase project, Firestore rules, seed demo data
- [ ] Set up Vercel deployment + connect repo
- [ ] Build auth + activation flow
- [ ] Stub all page routes

### Saturday (core features)
- [ ] Wallet home screen with real-time balances
- [ ] QR scanner + payment flow (end-to-end working)
- [ ] Benefits list + one-time redemption flow
- [ ] Partner dashboard with real-time transaction feed
- [ ] Activity registration flow + points
- [ ] Landmark check-in + map

### Sunday (polish + demo)
- [ ] Activity discovery tab with real Jungfrau data
- [ ] UI polish — animations, transitions, mobile layout
- [ ] Demo data reset script (for live demo)
- [ ] Presentation + architectural diagram
- [ ] Record backup video of full demo flow

---

## 10. Why This Architecture Wins the Criteria

| Criterion (weight) | How we address it |
|---|---|
| **Problem-solution fit (25%)** | Directly solves the fragmented guest card problem — one app replaces paper/multiple systems |
| **Feasibility & architecture (25%)** | Firebase + Next.js is production-proven; real-time updates actually work in demo; API-ready design |
| **Creativity & innovation (20%)** | Points-based discovery layer + sustainability check-ins + real activity data from the official Jungfrau marketplace |
| **UX & visual design (15%)** | Mobile-first, two clean views, smooth QR flow, real-time feedback |
| **Business value & rollout (15%)** | Firebase scales, Vercel deploys globally, partner onboarding is just generating a QR — zero friction |

---

## 11. Notes on Blockchain

The brief explicitly says: *"A strong submission does not need to prove that blockchain is always necessary."*

**Recommendation: skip blockchain.** A Firebase token ledger with server-side transaction validation gives the same trust model for a demo, with zero added complexity. If the jury asks, the answer is: *"The architecture is blockchain-ready — each transaction document is immutable once written, and the ledger logic can be migrated to a smart contract without changing the UX layer."* That's a credible answer.
