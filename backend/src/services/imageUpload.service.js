/**
 * 将 base64 图片转为万相 ref_img 可用的 data URL。
 * 万相 wanx-v1 支持 data:{mime};base64,{data} 格式，无需第三方图床。
 */
export function toWanxRefImage(dataUrl, { maxMb = 10 } = {}) {
  const match = dataUrl?.match(/^data:(image\/(?:jpeg|jpg|png|webp|bmp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('参考图格式无效，请上传 JPG/PNG 图片');
  }

  const mime = match[1].toLowerCase().replace('jpg', 'jpeg');
  const base64 = match[2];

  const sizeBytes = Math.floor(base64.length * 0.75);
  if (sizeBytes > maxMb * 1024 * 1024) {
    throw new Error(`参考图过大，请上传 ${maxMb}MB 以内的图片`);
  }

  return `data:${mime};base64,${base64}`;
}

/**
 * 上传图片获取公网 URL，供 GLM-4V 等仅支持 HTTP 链接的视觉 API 使用。
 */
export async function uploadForPublicUrl(dataUrl) {
  const match = dataUrl?.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mime.includes('png') ? 'png' : 'jpg';

  const uploaders = [
    uploadToLitterbox,
    uploadToSmMs,
  ];

  for (const upload of uploaders) {
    try {
      const url = await upload(buffer, mime, ext);
      if (url) return url;
    } catch (err) {
      console.warn('图床上传失败:', err.message);
    }
  }

  return null;
}

async function uploadToLitterbox(buffer, mime, ext) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('time', '24h');
  form.append('fileToUpload', new Blob([buffer], { type: mime }), `photo.${ext}`);

  const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(25000),
  });

  const text = (await res.text()).trim();
  if (!res.ok || !text.startsWith('http')) {
    throw new Error(`litterbox ${res.status}: ${text.slice(0, 80)}`);
  }
  return text;
}

async function uploadToSmMs(buffer, mime, ext) {
  const form = new FormData();
  form.append('smfile', new Blob([buffer], { type: mime }), `photo.${ext}`);

  const res = await fetch('https://sm.ms/api/v2/upload', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  if (data.success && data.data?.url) return data.data.url;
  throw new Error(data.message || 'sm.ms upload failed');
}
