require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const TOKEN_PACKS = {
  10:  { amount: 100,  label: '10 JungfrauPass Tokens' },
  50:  { amount: 499,  label: '50 JungfrauPass Tokens' },
  100: { amount: 899,  label: '100 JungfrauPass Tokens' },
};

// Create a Stripe Checkout Session and return its URL
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tokens } = req.body;
    const pack = TOKEN_PACKS[tokens];
    if (!pack) return res.status(400).json({ error: 'Invalid token pack' });

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
      success_url: `jungfraupass://topup?status=success&tokens=${tokens}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'jungfraupass://topup?status=cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify a completed session before crediting tokens
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
