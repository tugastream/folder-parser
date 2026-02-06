import cheerio from 'cheerio';

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch remote', status: r.status });
    const html = await r.text();
    const $ = cheerio.load(html);

    // ... resto do código permanece igual ...
  } catch (err) {
    console.error(err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'Internal error' });
  }
}
