// api/generate.js
// Vercel serverless function. This is the ONLY place your Gemini API key lives.
// It never reaches the buyer's browser.
//
// Required environment variable (set this in your Vercel project settings):
//   GEMINI_API_KEY - your free Google AI Studio API key

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessInput } = req.body || {};

  if (!businessInput) {
    return res.status(400).json({ error: 'Missing businessInput' });
  }

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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Content generation failed. Try again.' });
    }

    const data = await response.json();
    const textBlock = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const cleaned = textBlock.replace(/```json|```/g, '').trim();
    const set = JSON.parse(cleaned);

    return res.status(200).json({ result: set });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Try again.' });
  }
}
