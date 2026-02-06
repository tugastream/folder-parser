import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  try {
    // Fetch com User-Agent real (evita 403 em muitos servidores)
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      res.status(response.status).json({
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

        if (!href || href === "../" || href === "/") return null;

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
        /\.(mkv|mp4|avi|m4v|webm|srt|txt|zip|rar|7z)$/i.test(f.href || f.text)
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
    console.error("Parser error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}
