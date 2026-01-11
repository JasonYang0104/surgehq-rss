import { load } from 'cheerio';

export default async function handler(req, res) {
    // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
        return res.status(200).end();
  }

  if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
        const limit = parseInt(req.query.limit) || 20;
        const baseUrl = 'https://surgehq.ai';

      const response = await fetch(`${baseUrl}/blog`);
        const html = await response.text();
        const $ = load(html);

      const items = [];
        const articleLinks = new Set();

      $('a[href^="/blog/"]').each((_, el) => {
              const href = $(el).attr('href');
              if (href && href !== '/blog' && href.match(/^\/blog\/[^\/]+$/)) {
                        articleLinks.add(href);
              }
      });

      const linksArray = Array.from(articleLinks).slice(0, limit);

      for (const link of linksArray) {
              try {
                        const articleUrl = `${baseUrl}${link}`;
                        const articleResponse = await fetch(articleUrl);
                        const articleHtml = await articleResponse.text();
                        const $$ = load(articleHtml);

                const title = $$('title').text() || '';
                        const description = $$('meta[name="description"]').attr('content') ||
                                                     $$('meta[property="og:description"]').attr('content') || '';

                let pubDate;
                        const dateText = $$('*').filter((i, el) => {
                                    return $$(el).text().match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/);
                        }).first().text();

                const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/);
                        if (dateMatch) {
                                    pubDate = new Date(dateMatch[0]).toUTCString();
                        }

                const image = $$('meta[property="og:image"]').attr('content') || '';

                items.push({ title, link: articleUrl, description, pubDate, image });
              } catch (error) {
                        console.error(`Error fetching ${link}:`, error.message);
              }
      }

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
            <title>Surge AI Blog</title>
                <link>${baseUrl}/blog</link>
                    <description>Our latest thoughts, notes, and insights from the post-training frontier.</description>
                        <language>en-us</language>
                        ${items.map(item => `    <item>
                              <title><![CDATA[${item.title}]]></title>
                                    <link>${item.link}</link>
                                          <description><![CDATA[${item.description}]]></description>
                                                ${item.pubDate ? `<pubDate>${item.pubDate}</pubDate>` : ''}
                                                      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg"/>` : ''}
                                                          </item>`).join('\n')}
                                                            </channel>
                                                            </rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(rss);
  } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error: ${error.message}`);
  }
}
