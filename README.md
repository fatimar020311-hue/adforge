# AdForge — deployment guide

This is the "sellable" version of AdForge: your API key stays private on a server,
buyers get exactly one free generation, and a real Gumroad purchase unlocks
unlimited use.

## What's in this folder

```
adforge-pro/
├── public/index.html   ← the buyer-facing tool
├── api/generate.js     ← serverless function that holds your API key and talks to Anthropic + Gumroad
└── README.md           ← this file
```

## 1. Deploy it (free, ~10 minutes)

This project is built for **Vercel**, which has a generous free tier and needs no
server management.

1. Create a free account at vercel.com.
2. Put this folder in a GitHub repository (create a new repo, upload these files).
3. In Vercel, click "Add New Project" → import that repo → Deploy.
   Vercel automatically detects `public/` as static files and `api/generate.js`
   as a serverless function. No configuration needed.
4. Once deployed, you'll get a live URL like `adforge-yourname.vercel.app`.

## 2. Add your secret keys

In your Vercel project: **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your real Anthropic API key (from console.anthropic.com) |
| `GUMROAD_PRODUCT_PERMALINK` | The permalink of your Gumroad product, e.g. `adforge` |

Redeploy after adding these (Vercel prompts you to).

Your API key now lives only on Vercel's server — it is never sent to a buyer's browser.

## 3. Set up Gumroad license keys

1. Create your AdForge product on Gumroad as usual.
2. In the product's edit page, find **"Generate a unique license key per sale"**
   and turn it on.
3. Note your product's permalink (the part of your Gumroad URL after `/l/`) —
   this is the `GUMROAD_PRODUCT_PERMALINK` value above.
4. In `public/index.html`, replace `https://gumroad.com/l/YOUR-PRODUCT-SLUG`
   with your actual product URL.

When someone buys, Gumroad emails them a unique license key automatically.
They paste it into the "Unlock" box in AdForge, and your backend verifies it
directly against Gumroad's servers before unlocking anything.

## 4. How the free trial works

- Each browser gets exactly one free generation, tracked with `localStorage`.
- This is good enough to launch and see if people convert — but a technical
  user could clear their browser storage or use incognito mode to get another
  free run. That's a normal, accepted trade-off for small early-stage products.

### Hardening the free trial later (optional, once you have real volume)

If you start seeing trial abuse, add server-side rate limiting by IP or device
fingerprint using a small key-value store like **Vercel KV** or **Upstash Redis**
(both have free tiers). The `api/generate.js` function is already structured so
you can drop that check in right where the trial mode is handled — look for the
comment "Note: trial mode has no server-side usage cap."

## 5. Test before you sell

1. Visit your deployed URL. Try the free generation — confirm it works and locks
   after one use.
2. Buy your own product on Gumroad (or use Gumroad's test mode) to get a real
   license key, paste it in, confirm it unlocks unlimited generations.
3. Only then share the link publicly.

## Costs to expect

- Vercel: free tier covers this comfortably at low-to-moderate traffic.
- Anthropic API: pay-per-use, billed to your Anthropic account based on actual
  generations — budget a few cents per generation and check current pricing at
  console.anthropic.com before setting your product price.
- Gumroad: no fee to enable license keys; standard Gumroad transaction fees apply
  per sale.
