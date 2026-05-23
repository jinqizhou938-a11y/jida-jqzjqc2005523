import { v4 as uuidv4 } from 'uuid';
import { extractDouyinUrl } from '../utils/douyinParser.js';
import { getVideoInfo, extractFrames, toDataUrl } from '../services/douyin.service.js';
import { selectBestFrame, recognizeOutfit } from '../services/ai.service.js';
import { generateTryOnPreview } from '../services/tryOn.service.js';

function validateUserPhoto(userPhoto) {
  if (!userPhoto || typeof userPhoto !== 'string') {
    const err = new Error('请先上传您的全身正面照');
    err.code = 'USER_PHOTO_REQUIRED';
    err.status = 400;
    throw err;
  }
  if (!userPhoto.startsWith('data:image/')) {
    const err = new Error('用户照片格式无效，请上传 JPG/PNG 图片');
    err.code = 'INVALID_USER_PHOTO';
    err.status = 400;
    throw err;
  }
  const sizeEstimate = userPhoto.length * 0.75;
  if (sizeEstimate > 8 * 1024 * 1024) {
    const err = new Error('照片过大，请上传 8MB 以内的图片');
    err.code = 'USER_PHOTO_TOO_LARGE';
    err.status = 400;
    throw err;
  }
}

export async function parseUrl(input) {
  const url = extractDouyinUrl(input);
  return {
    valid: url !== null,
    url: url || null,
  };
}

export async function generateCard(url, _userId = null, userPhoto = null) {
  validateUserPhoto(userPhoto);

  const cleanUrl = extractDouyinUrl(url);
  if (!cleanUrl) {
    const err = new Error('仅支持抖音视频链接');
    err.code = 'INVALID_URL';
    err.status = 400;
    throw err;
  }

  const videoInfo = await getVideoInfo(cleanUrl);
  const { displayUrls, aiUrls } = await extractFrames(
    cleanUrl,
    videoInfo.videoUrl,
    videoInfo.coverUrl,
    videoInfo.duration
  );

  const bestFrame = await selectBestFrame(aiUrls, displayUrls, cleanUrl);
  const recognition = await recognizeOutfit(bestFrame.ai_url, cleanUrl);

  const uniqueFrameUrls = [...new Set(aiUrls.filter((u) => u?.startsWith('http')))].slice(0, 8);

  const tryOn = await generateTryOnPreview(userPhoto, recognition, {
    sourceFrameUrl: bestFrame.ai_url,
    sourceFrameUrls: uniqueFrameUrls.length ? uniqueFrameUrls : [bestFrame.ai_url].filter(Boolean),
  });

  const sourceFrameImage = (await toDataUrl(bestFrame.url)) || bestFrame.url;
  const displayThumbs = await Promise.all(
    displayUrls.map(async (u) => (u.startsWith('http') ? await toDataUrl(u) : u) || u)
  );

  const cardResponse = {
    id: uuidv4(),
    user_id: null,
    source_url: cleanUrl,
    image_url: tryOn.try_on_image_url,
    thumbnail_urls: [sourceFrameImage, userPhoto, ...displayThumbs.slice(0, 2)],
    style: recognition.style,
    items: recognition.items,
    color_palette: recognition.color_palette,
    scene: recognition.scene,
    body_type_advice: recognition.body_type_advice,
    style_tags: recognition.style_tags,
    accessories: recognition.accessories,
    season: recognition.season,
    aesthetic: recognition.aesthetic,
    matching_tips: recognition.matching_tips,
    recommendation_score: recognition.recommendation_score,
    recommendation_summary: recognition.recommendation_summary,
    is_try_on_preview: true,
    source_frame_url: sourceFrameImage,
    ai_raw: {
      ...recognition.ai_raw,
      style_tags: recognition.style_tags,
      accessories: recognition.accessories,
      season: recognition.season,
      aesthetic: recognition.aesthetic,
      matching_tips: recognition.matching_tips,
      recommendation_score: recognition.recommendation_score,
      recommendation_summary: recognition.recommendation_summary,
      try_on: tryOn,
      source_frame_url: sourceFrameImage,
      is_try_on_preview: true,
    },
  };

  return cardResponse;
}
