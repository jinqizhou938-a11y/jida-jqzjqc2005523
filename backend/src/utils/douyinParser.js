const DOUYIN_PATTERNS = [
  /https?:\/\/v\.douyin\.com\/[\w\-]+\/?/i,
  /https?:\/\/www\.douyin\.com\/video\/\d+/i,
  /https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+/i,
];

function cleanUrl(url) {
  return url.replace(/\/+$/, '').split(/[\s\u4e00-\u9fff]/)[0];
}

export function extractDouyinUrl(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  for (const pattern of DOUYIN_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return cleanUrl(match[0]);
  }

  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    const candidate = cleanUrl(urlMatch[0]);
    for (const pattern of DOUYIN_PATTERNS) {
      if (pattern.test(candidate)) return candidate;
    }
  }

  return null;
}

export function isValidDouyinUrl(url) {
  return extractDouyinUrl(url) !== null;
}
