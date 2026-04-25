require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const TOKEN_PACKS = {
  10:  { amount: 100,  label: '10 JungfrauPass Tokens' },
  50:  { amount: 499,  label: '50 JungfrauPass Tokens' },
  100: { amount: 899,  label: '100 JungfrauPass Tokens' },
};

const DAY_PACKS = {
  1: { amount: 2000,  label: '1-Day JungfrauPass' },
  3: { amount: 5000,  label: '3-Day JungfrauPass' },
  7: { amount: 10000, label: '7-Day JungfrauPass' },
};

// Parse invoice file (PDF or text/md) and return raw text
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/parse-invoice', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const isPdf = req.file.mimetype === 'application/pdf'
      || req.file.originalname?.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const data = await pdfParse(req.file.buffer);
      return res.json({ text: data.text });
    }
    // Plain text / markdown — return as-is
    res.json({ text: req.file.buffer.toString('utf8') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a Stripe Checkout Session and return its URL
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tokens, redirectUrl } = req.body;
    const pack = TOKEN_PACKS[tokens];
    if (!pack) return res.status(400).json({ error: 'Invalid token pack' });

    const base = redirectUrl || 'jungfraupass://topup';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'chf',
          product_data: { name: pack.label },
          unit_amount: pack.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${base}?status=success&tokens=${tokens}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}?status=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create a Stripe Checkout Session for a day pass
app.post('/create-daypass-session', async (req, res) => {
  try {
    const { days, redirectUrl } = req.body;
    const pack = DAY_PACKS[days];
    if (!pack) return res.status(400).json({ error: 'Invalid day pack' });

    const base = redirectUrl || 'jungfraupass://daypass';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'chf',
          product_data: { name: pack.label },
          unit_amount: pack.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${base}?status=success&days=${days}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}?status=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify a completed session before crediting tokens/days
app.get('/verify-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.json({ paid: session.payment_status === 'paid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

module.exports = app;
