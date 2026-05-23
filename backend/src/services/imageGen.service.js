import { toWanxRefImage } from './imageUpload.service.js';

const DASHSCOPE_BASE =
  process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
const WAN27_SUBMIT_API =
  process.env.WAN27_SUBMIT_API_URL ||
  `${DASHSCOPE_BASE}/services/aigc/image-generation/generation`;
const WANX_SUBMIT_API =
  process.env.WANX_SUBMIT_API_URL ||
  `${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`;
const TASK_API = process.env.WANX_TASK_API_URL || `${DASHSCOPE_BASE}/tasks`;
const WANX_MODEL = process.env.WANX_IMAGE_MODEL || 'wan2.7-image-pro';

function getApiKey() {
  return process.env.DASHSCOPE_API_KEY?.trim();
}

export function getDefaultImageSize() {
  return process.env.WANX_IMAGE_SIZE || '2K';
}

function isWan27Model(model = WANX_MODEL) {
  return /wan2\.[567]/i.test(model);
}

function resolveImagePayload(image) {
  if (!image) throw new Error('缺少参考图，无法生成试穿预览');
  if (image.startsWith('http')) return image;
  if (image.startsWith('data:image/')) return toWanxRefImage(image, { maxMb: 20 });
  throw new Error('参考图格式无效');
}

function extractImageUrl(data) {
  const content = data.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.image) return item.image;
    }
  }
  return data.output?.results?.[0]?.url || null;
}

async function waitForTask(taskId, { maxWaitMs = 180000, intervalMs = 2500 } = {}) {
  const apiKey = getApiKey();
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`${TASK_API}/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(`查询万相任务失败 ${res.status}: ${data.message || data.code || ''}`);
    }

    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') {
      const url = extractImageUrl(data);
      if (!url) throw new Error('万相任务成功但未返回图片 URL');
      return url;
    }
    if (status === 'FAILED') {
      throw new Error(data.output?.message || data.output?.code || '万相生图任务失败');
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('万相生图超时，请稍后重试');
}

async function createAsyncTask(body) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 DASHSCOPE_API_KEY，无法生成试穿图');

  const response = await fetch(WAN27_SUBMIT_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `通义万相生图失败 ${response.status}: ${data.message || data.code || JSON.stringify(data).slice(0, 300)}`
    );
  }

  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('通义万相未返回 task_id');
  return taskId;
}

/** Wan2.7-Image-Pro 多图编辑：图1 模特 + 图2~9 穿搭参考，仅生成 1 张输出 */
async function generateWan27ImageEdit(prompt, userPhoto, options = {}) {
  const {
    referenceImages = [],
    outfitImage = null,
    size = getDefaultImageSize(),
    thinkingMode = process.env.WAN27_THINKING_MODE !== 'false',
    watermark = false,
  } = options;

  const outfitRefs = (referenceImages.length ? referenceImages : outfitImage ? [outfitImage] : [])
    .filter(Boolean)
    .slice(0, 8);

  const userPayload = resolveImagePayload(userPhoto);
  const content = [{ text: prompt }, { image: userPayload }];
  for (const ref of outfitRefs) {
    content.push({ image: resolveImagePayload(ref) });
  }

  const taskId = await createAsyncTask({
    model: WANX_MODEL,
    input: {
      messages: [{ role: 'user', content }],
    },
    parameters: {
      size,
      n: 1,
      watermark,
      thinking_mode: thinkingMode,
    },
  });

  console.log(
    'Wan2.7 图像编辑任务已创建:',
    taskId,
    `(参考图 ${1 + outfitRefs.length} 张, 输出 1 张)`
  );
  return waitForTask(taskId);
}

/** wanx-v1 图生图（旧版兼容） */
async function generateWanxV1Image(prompt, refImage, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 DASHSCOPE_API_KEY，无法生成试穿图');

  const {
    size = process.env.WANX_IMAGE_SIZE || '720*1280',
    refStrength = Number(process.env.WANX_REF_STRENGTH || 0.38),
    refMode = process.env.WANX_REF_MODE || 'repaint',
    style = process.env.WANX_IMAGE_STYLE || '<photography>',
    negativePrompt = '',
  } = options;

  const input = { prompt, ref_img: resolveImagePayload(refImage) };
  if (negativePrompt) input.negative_prompt = negativePrompt;

  const response = await fetch(WANX_SUBMIT_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input,
      parameters: { style, size, n: 1, ref_strength: refStrength, ref_mode: refMode },
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `通义万相生图失败 ${response.status}: ${data.message || data.code || JSON.stringify(data).slice(0, 200)}`
    );
  }

  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('通义万相未返回 task_id');
  console.log('wanx-v1 图生图任务已创建:', taskId);
  return waitForTask(taskId);
}

/**
 * 试穿生图：默认 Wan2.7-Image-Pro 双图编辑；可通过 WANX_IMAGE_MODEL=wanx-v1 回退
 */
export async function generateImageWithReference(prompt, refImage, options = {}) {
  if (isWan27Model()) {
    return generateWan27ImageEdit(prompt, refImage, options);
  }
  return generateWanxV1Image(prompt, refImage, options);
}

export async function downloadImageAsDataUrl(imageUrl) {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('试穿图下载失败');
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export { WANX_MODEL, isWan27Model };
