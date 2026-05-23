const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export async function resolveShortUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': MOBILE_UA },
      signal: AbortSignal.timeout(15000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

export function extractVideoId(pageUrl) {
  const patterns = [
    /video\/(\d+)/,
    /note\/(\d+)/,
    /modal_id=(\d+)/,
    /item_ids=(\d+)/,
  ];
  for (const p of patterns) {
    const m = pageUrl.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function fetchCoverViaHttp(douyinUrl) {
  const resolved = await resolveShortUrl(douyinUrl);
  const videoId = extractVideoId(resolved);

  const urlsToTry = [resolved];
  if (videoId) {
    urlsToTry.push(`https://www.douyin.com/video/${videoId}`);
    urlsToTry.push(`https://www.iesdouyin.com/share/video/${videoId}`);
  }

  for (const pageUrl of urlsToTry) {
    const cover = await scrapeCoverFromPage(pageUrl);
    if (cover) return cover;
  }

  if (videoId) {
    const apiCover = await fetchCoverFromApi(videoId);
    if (apiCover) return apiCover;
  }

  return null;
}

async function scrapeCoverFromPage(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': MOBILE_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s+property="og:image"/i);
    if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

    const jsonPatterns = [
      /"cover"\s*:\s*\{[^}]*"url_list"\s*:\s*\["([^"]+)"/,
      /"origin_cover"\s*:\s*\{[^}]*"url_list"\s*:\s*\["([^"]+)"/,
      /"dynamic_cover"\s*:\s*\{[^}]*"url_list"\s*:\s*\["([^"]+)"/,
      /"poster"\s*:\s*"([^"]+)"/,
      /"thumbnail"\s*:\s*"([^"]+)"/,
    ];
    for (const p of jsonPatterns) {
      const m = html.match(p);
      if (m?.[1]) return decodeHtmlEntities(m[1].replace(/\\u002F/g, '/'));
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchCoverFromApi(videoId) {
  const apiUrls = [
    `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
    `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': MOBILE_UA,
          Referer: 'https://www.douyin.com/',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const item = data?.item_list?.[0] || data?.aweme_detail;
      const cover =
        item?.video?.cover?.url_list?.[0] ||
        item?.video?.origin_cover?.url_list?.[0] ||
        item?.video?.dynamic_cover?.url_list?.[0];
      if (cover) return cover;
    } catch {
      /* try next */
    }
  }
  return null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/');
}
