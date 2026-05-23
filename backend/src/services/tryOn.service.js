import { generateImageWithReference, downloadImageAsDataUrl, getDefaultImageSize, isWan27Model } from './imageGen.service.js';
import { callGLM4VWithHttpUrl } from './ai.service.js';
import { uploadForPublicUrl } from './imageUpload.service.js';

const USER_MODEL_PROMPT = `试衣模特照。只描述人物外貌（性别、发型、体型、肤色、站姿），禁止描述任何衣物和道具。JSON：{"gender_presentation":"","body_type":"","hair":"","skin_tone":"","pose":"","model_hint":"30字内无服装"}`;

const USER_CLOTHES_PROMPT = `列出此照片中人物当前穿着/持有的所有物品，只输出 JSON：{"remove_list":["深蓝色夹克","足球",...]}`;

const VIDEO_OUTFIT_PROMPT = `抖音穿搭视频关键帧。精确描述整套穿搭每件单品（款式颜色材质）。JSON：{"outfit_brief":"80字内完整穿搭描述","items":["上衣：...","下装：...","鞋：..."]}`;

async function uploadTempForVision(base64DataUrl) {
  return uploadForPublicUrl(base64DataUrl);
}

export async function analyzeUserModel(userPhotoDataUrl) {
  const fallback = {
    gender_presentation: '中性',
    body_type: '标准',
    pose: '自然正面站立',
    hair: '日常发型',
    skin_tone: '自然肤色',
    model_hint: '年轻模特正面站立',
  };

  try {
    const httpUrl = await uploadTempForVision(userPhotoDataUrl);
    if (httpUrl) {
      const result = await callGLM4VWithHttpUrl(httpUrl, USER_MODEL_PROMPT, {
        temperature: 0.1,
        maxTokens: 400,
      });
      return { ...fallback, ...result };
    }
  } catch (err) {
    console.warn('模特照片分析失败:', err.message);
  }
  return fallback;
}

async function detectOriginalClothes(userPhotoDataUrl) {
  try {
    const httpUrl = await uploadTempForVision(userPhotoDataUrl);
    if (!httpUrl) return [];
    const result = await callGLM4VWithHttpUrl(httpUrl, USER_CLOTHES_PROMPT, {
      temperature: 0.1,
      maxTokens: 400,
    });
    return result.remove_list || [];
  } catch {
    return [];
  }
}

async function enrichOutfitFromVideoFrame(sourceFrameUrl, recognition) {
  const base = buildOutfitDescription(recognition);
  if (!sourceFrameUrl?.startsWith('http')) {
    return { outfitText: base, videoOutfit: null };
  }

  try {
    const videoOutfit = await callGLM4VWithHttpUrl(sourceFrameUrl, VIDEO_OUTFIT_PROMPT, {
      temperature: 0.1,
      maxTokens: 600,
    });
    const items = videoOutfit.items?.join('；') || videoOutfit.outfit_brief || base;
    return { outfitText: items, videoOutfit };
  } catch (err) {
    console.warn('视频帧穿搭分析失败:', err.message);
    return { outfitText: base, videoOutfit: null };
  }
}

function buildOutfitDescription(recognition) {
  return (recognition.items || [])
    .map((item) => [item.type, item.name || item.detail, item.color, item.material].filter(Boolean).join(''))
    .join('；');
}

function buildTryOnPrompt(userModel, outfitText, recognition, removeList, useMultiImage, outfitRefCount) {
  const style = recognition.style || '时尚';
  const avoid = removeList.length ? `不要保留：${removeList.join('、')}。` : '';

  if (useMultiImage && outfitRefCount > 0) {
    const refDesc =
      outfitRefCount === 1
        ? '图2是视频穿搭参考'
        : `图2至图${outfitRefCount + 1}是视频穿搭参考帧`;
    return [
      `虚拟换装：图1是试衣模特，${refDesc}。`,
      '保留图1人物的脸型、发型、体型、肤色、站姿；删除图1原有全部衣服和手持物。',
      '综合参考穿搭图，将视频中的整套穿搭完整穿到图1模特身上，款式、颜色、材质须一致。',
      `穿搭细节：${outfitText}。`,
      avoid,
      `风格${style}，写实高清全身照，自然融合。仅输出一张试穿结果图。`,
    ].join('').slice(0, 4800);
  }

  const model = `${userModel.gender_presentation || ''}${userModel.model_hint || '模特'}，${userModel.hair || ''}，${userModel.body_type || '标准'}体型，${userModel.pose || '正面站立'}`;
  return [
    `虚拟换装：模特穿以下视频穿搭（必须完全一致）：${outfitText}。`,
    `模特外貌保持：${model}。`,
    avoid,
    `风格${style}，写实全身照，浅灰背景，高清。`,
    '删除参考图中原有全部衣服和手持物，只保留人脸身材。',
  ].join('').slice(0, 780);
}

function buildNegativePrompt(removeList) {
  const base = [
    '原图服装', '参考图衣服', '未换装', '旧衣服', '足球', '篮球', '手持物品',
    '低质量', '模糊', '变形', '多余肢体', '水印', '文字',
  ];
  const merged = [...new Set([...removeList, ...base])];
  return merged.join('，').slice(0, 480);
}

export async function generateTryOnPreview(userPhotoDataUrl, recognition, options = {}) {
  const { sourceFrameUrl = null, sourceFrameUrls = [] } = options;
  const useWan27 = isWan27Model();

  const outfitRefs = [...new Set(
    (sourceFrameUrls.length ? sourceFrameUrls : [sourceFrameUrl]).filter(Boolean)
  )].slice(0, 8);

  const [userModel, { outfitText, videoOutfit }, removeList] = await Promise.all([
    analyzeUserModel(userPhotoDataUrl),
    enrichOutfitFromVideoFrame(outfitRefs[0] || sourceFrameUrl, recognition),
    detectOriginalClothes(userPhotoDataUrl),
  ]);

  const prompt = buildTryOnPrompt(
    userModel,
    outfitText,
    recognition,
    removeList,
    useWan27 && outfitRefs.length > 0,
    outfitRefs.length
  );
  const negativePrompt = buildNegativePrompt(removeList);

  console.log('试穿 prompt(%d字):', prompt.length, prompt.slice(0, 200));
  console.log('穿搭参考帧数:', outfitRefs.length, '(最多8张, 总计参考图最多9张)');

  const genOptions = {
    size: getDefaultImageSize(),
    referenceImages: useWan27 ? outfitRefs : undefined,
    outfitImage: useWan27 ? outfitRefs[0] : undefined,
    negativePrompt: useWan27 ? undefined : negativePrompt,
    refStrength: Number(process.env.WANX_REF_STRENGTH || 0.38),
    refMode: 'repaint',
    style: '<photography>',
  };

  const imageUrl = await generateImageWithReference(prompt, userPhotoDataUrl, genOptions);
  const dataUrl = await downloadImageAsDataUrl(imageUrl);

  return {
    try_on_image_url: dataUrl,
    try_on_prompt: prompt,
    negative_prompt: useWan27 ? null : negativePrompt,
    user_profile: userModel,
    video_outfit: videoOutfit,
    removed_original_items: removeList,
    outfit_source: 'video_keyframe',
    source_image_url: userPhotoDataUrl,
    source_frame_url: outfitRefs[0] || sourceFrameUrl,
    source_frame_urls: outfitRefs,
    image_provider: useWan27 ? 'dashscope-wan2.7-image-pro' : 'dashscope-wanx-v1',
    ref_strength: useWan27 ? null : genOptions.refStrength,
    generated_at: new Date().toISOString(),
  };
}
