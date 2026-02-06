import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  try {
    // Fetch da pasta (Node 24 já tem fetch nativo)
    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      res.status(502).json({
        error: "Failed to fetch remote",
        status: response.status
      });
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const anchors = $("a").toArray();

    const files = anchors
      .map((a) => {
        const href = $(a).attr("href") || "";
        const text = $(a).text().trim();

        // Ignorar diretórios parent
        if (href === "../" || href === "/") return null;

        // Tentar extrair tamanho (Apache/Nginx index)
        let size = null;
        const parent = $(a).parent();
        const siblingText = parent.text().replace(text, "").trim();
        const match = siblingText.match(
          /(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB|TB|K|M|G))/i
        );
        if (match) size = match[1];

        return { href, text, size };
      })
      .filter(Boolean)
      .filter((f) =>
        /\.(mkv|mp4|avi|m4v|webm|srt|txt|zip)$/i.test(f.href || f.text)
      )
      .map((f) => {
        const abs = new URL(f.href, url).href;
        const name =
          f.text && f.text !== ""
            ? f.text
            : abs.split("/").pop().split("?")[0];

        return {
          name: decodeURIComponent(name.replace(/\+/g, " ")),
          href: abs,
          size: f.size || null
        };
      });

    const title = decodeURIComponent(
      new URL(url).pathname.split("/").filter(Boolean).pop() || ""
    );

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ title, files });
  } catch (err) {
    console.error(err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "Internal error" });
  }
}
