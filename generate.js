// api/generate.js
// Vercel serverless function. This is the ONLY place your Anthropic API key lives.
// It never reaches the buyer's browser.
//
// Required environment variables (set these in your Vercel project settings):
//   ANTHROPIC_API_KEY        - your real Anthropic API key
//   GUMROAD_PRODUCT_PERMALINK - the permalink of your Gumroad product (e.g. "adforge")
//
// Flow:
//   1. Frontend sends { mode: "trial" } for the one free generation, OR
//      { mode: "licensed", licenseKey: "..." } after purchase.
//   2. If licensed, we verify the key against Gumroad's License Verification API.
//      https://api.gumroad.com/v2/licenses/verify
//   3. Only if trial or license checks out do we call Anthropic and return the result.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, licenseKey, businessInput } = req.body || {};

  if (!businessInput) {
    return res.status(400).json({ error: 'Missing businessInput' });
  }

  // --- Step 1: authorize the request ---
  if (mode === 'licensed') {
    if (!licenseKey) {
      return res.status(401).json({ error: 'License key required' });
    }
    const valid = await verifyGumroadLicense(licenseKey);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid or already-used license key' });
    }
  } else if (mode !== 'trial') {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  // Note: "trial" mode has no server-side usage cap in this starter version.
  // The frontend limits it to one free run per browser via localStorage, which is
  // fine for launch but not tamper-proof. See README.md "Hardening the free trial"
  // for how to add a real server-side limit (Vercel KV / Upstash) once you have volume
  // worth protecting.

  // --- Step 2: build the prompt ---
  const { bizname, industry, offer, tone, platform } = businessInput;
  const prompt = `You are a marketing copywriter creating content for a small business.
Business name: ${bizname}
Industry: ${industry || 'not specified'}
What they're promoting: ${offer}
Tone: ${tone}
Primary platform: ${platform}

Return ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "ads": [
    {"headline": "...", "body": "1-2 sentence ad body", "cta": "short call to action, e.g. Shop Now"}
  ],
  "captions": [
    {"text": "a social caption, 1-3 sentences, matches the tone and platform", "hashtags": "5-8 relevant hashtags separated by spaces, each starting with #"}
  ],
  "ideas": ["a short content idea/hook for a future post", "..."]
}
Include exactly 3 items in "ads", exactly 5 items in "captions", and exactly 5 items in "ideas". Make each item genuinely different in angle (e.g. urgency, social proof, curiosity, benefit-led, story-led). Match the requested tone and platform conventions. Return raw JSON only.`;

  // --- Step 3: call Anthropic with the SERVER's key ---
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Content generation failed. Try again.' });
    }

    const data = await response.json();
    const textBlock = (data.content || []).map((b) => b.text || '').join('');
    const cleaned = textBlock.replace(/```json|```/g, '').trim();
    const set = JSON.parse(cleaned);

    return res.status(200).json({ result: set });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Try again.' });
  }
}

async function verifyGumroadLicense(licenseKey) {
  try {
    const params = new URLSearchParams({
      product_permalink: process.env.GUMROAD_PRODUCT_PERMALINK,
      license_key: licenseKey,
    });
    const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();
    // Gumroad returns { success: true, purchase: {...} } for a valid key.
    return data.success === true;
  } catch (err) {
    console.error('Gumroad verification error:', err);
    return false;
  }
}
