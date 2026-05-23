import { fetchCoverViaHttp } from './douyinFetch.service.js';

const ZHIPU_API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_VISION_MODEL = process.env.ZHIPU_VISION_MODEL || 'glm-4v-flash';

const SELECT_PROMPT = `你是专业时尚影像分析师。评估这张抖音穿搭视频截图是否适合作为搭配卡片主图。

评分维度：
1. 人物穿搭是否完整可见（全身或至少上半身+下装）
2. 衣物细节是否清晰（材质、版型可辨认）
3. 画面是否无严重遮挡、模糊、过曝

仅返回 JSON，不要其他文字：
{
  "completeness_score": 0-10整数,
  "full_body_visible": true或false,
  "clarity_score": 0-10整数,
  "reason": "20字内说明"
}`;

const RECOGNIZE_PROMPT = `你是资深时尚搭配师与造型顾问。请仔细观察图中人物的穿搭，输出详尽、具体、可落地的分析。

要求：
- 每件单品必须描述：品类、具体款式名、颜色、材质/面料、版型/剪裁、图案/细节特征
- 不要只写颜色，要写清「什么款式的什么衣服」
- 识别包包、鞋、帽子、首饰等配饰
- 给出风格标签、适用场景、季节、配色逻辑
- 给出体型适配建议与3条搭配技巧
- 给出推荐评分(1-10)和推荐理由

仅返回 JSON，不要 markdown，不要其他文字：
{
  "style": "主风格（如：韩系清冷极简）",
  "style_tags": ["标签1", "标签2", "标签3"],
  "aesthetic": "整体美学气质一句话描述",
  "season": "春/夏/秋/冬/四季",
  "scene": "通勤/约会/逛街/运动/度假/日常",
  "items": [
    {
      "type": "品类（上衣/下装/外套/连衣裙/鞋/包/配饰）",
      "name": "具体款式名称（如：宽松亚麻立领衬衫）",
      "color": "颜色",
      "material": "材质/面料",
      "fit": "版型（修身/宽松/直筒/A字等）",
      "pattern": "图案（纯色/条纹/格纹/印花等）",
      "style_detail": "设计细节（领型/袖型/长度/特殊设计）",
      "detail": "综合描述（30字内）"
    }
  ],
  "accessories": ["配饰1", "配饰2"],
  "color_palette": [
    {"name": "色彩名", "hex": "#RRGGBB", "role": "主色/辅色/点缀色"}
  ],
  "color_harmony": "配色逻辑与视觉效果说明",
  "body_type_advice": "针对不同体型的穿着建议",
  "matching_tips": ["搭配技巧1", "搭配技巧2", "搭配技巧3"],
  "recommendation_score": 1-10,
  "recommendation_summary": "为什么推荐这套搭配，适合什么人穿"
}`;

function getApiKey() {
  return process.env.ZHIPU_API_KEY?.trim();
}

function parseJsonFromContent(content) {
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回格式无效');
  return JSON.parse(jsonMatch[0]);
}

export async function callGLM4VWithHttpUrl(httpUrl, prompt, { temperature = 0.3, maxTokens = 512 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('未配置 ZHIPU_API_KEY');

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ZHIPU_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: httpUrl } },
        ],
      }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`智谱 API 错误 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return parseJsonFromContent(content);
}

export { parseJsonFromContent };

async function resolveVisionUrl(imageUrl, douyinUrl) {
  if (imageUrl?.startsWith('http')) return imageUrl;
  const httpCover = await fetchCoverViaHttp(douyinUrl);
  if (httpCover?.startsWith('http')) return httpCover;
  throw new Error('无法获取可供 AI 分析的图片 URL，请重试');
}

async function callGLM4V(imageUrl, prompt, douyinUrl, { temperature = 0.3, maxTokens = 2048 } = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('⚠️  未配置 ZHIPU_API_KEY，使用 Mock 数据');
    return mockAIResponse(prompt);
  }

  const visionUrl = await resolveVisionUrl(imageUrl, douyinUrl);

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ZHIPU_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: visionUrl } },
        ],
      }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`智谱 API 错误 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return parseJsonFromContent(content);
}

function mockAIResponse(prompt) {
  if (prompt.includes('completeness_score')) {
    return {
      completeness_score: 8,
      full_body_visible: true,
      clarity_score: 7,
      reason: '穿搭展示较完整',
    };
  }

  return {
    style: '日系文艺极简',
    style_tags: ['日系', '极简', '松弛感', '自然风'],
    aesthetic: '低饱和大地色系，松弛不刻意的日常文艺感',
    season: '春秋',
    scene: '日常',
    items: [
      {
        type: '上衣',
        name: '宽松棉麻衬衫',
        color: '燕麦色',
        material: '棉麻混纺',
        fit: '宽松',
        pattern: '纯色',
        style_detail: '落肩、圆角下摆、隐形扣',
        detail: '燕麦色宽松棉麻衬衫，落肩设计',
      },
      {
        type: '下装',
        name: '高腰直筒牛仔裤',
        color: '浅水洗蓝',
        material: '牛仔布',
        fit: '直筒',
        pattern: '纯色',
        style_detail: '高腰、九分长度、毛边裤脚',
        detail: '浅水洗高腰直筒九分牛仔裤',
      },
      {
        type: '鞋',
        name: '复古德训鞋',
        color: '米白拼灰',
        material: '皮革+绒面',
        fit: '常规',
        pattern: '拼色',
        style_detail: '经典三条杠、橡胶底',
        detail: '米白拼灰复古德训鞋',
      },
    ],
    accessories: ['草编托特包', '细框金属眼镜'],
    color_palette: [
      { name: '燕麦色', hex: '#E8DCC8', role: '主色' },
      { name: '浅牛仔蓝', hex: '#8FAFC9', role: '辅色' },
      { name: '米白', hex: '#F5F0E8', role: '点缀色' },
    ],
    color_harmony: '大地色+牛仔蓝经典组合，低对比度营造温柔文艺氛围',
    body_type_advice: '梨形身材：高腰直筒裤修饰胯部；小个子：衬衫塞一角提高腰线',
    matching_tips: [
      '衬衫可单穿或作薄外套叠搭',
      '配草编包强化度假文艺感',
      '可加细腰带强调腰线比例',
    ],
    recommendation_score: 8,
    recommendation_summary: '经典日系日常搭配，低饱和配色易上手，适合文艺气质与通勤休闲场景',
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ type: '未知', color: '未知', detail: '未能识别', name: '未知单品' }];
  }

  return items.map((item) => ({
    type: item.type || '单品',
    color: item.color || '未知',
    detail: item.detail || item.style_detail || item.name || `${item.type} ${item.color}`,
    name: item.name || item.detail || item.type,
    material: item.material || '',
    fit: item.fit || '',
    pattern: item.pattern || '',
    style_detail: item.style_detail || '',
  }));
}

export async function selectBestFrame(aiUrls, displayUrls, douyinUrl) {
  const results = await Promise.all(
    aiUrls.map(async (aiUrl, index) => {
      try {
        const score = await callGLM4V(aiUrl, SELECT_PROMPT, douyinUrl, { temperature: 0.1, maxTokens: 256 });
        const combined = (score.completeness_score || 0) * 0.7 + (score.clarity_score || 0) * 0.3;
        return {
          index,
          url: displayUrls[index] || aiUrl,
          ai_url: aiUrl,
          ...score,
          combined_score: combined,
        };
      } catch (err) {
        console.error(`帧 ${index} 择优失败:`, err.message);
        return {
          index,
          url: displayUrls[index] || aiUrl,
          ai_url: aiUrl,
          completeness_score: 5,
          combined_score: 5,
          reason: '分析失败',
        };
      }
    })
  );

  results.sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0));
  const best = results[0];

  if ((best.completeness_score || 0) < 5) {
    const err = new Error('该视频穿搭不明显，换一个试试吧');
    err.code = 'OUTFIT_NOT_CLEAR';
    err.status = 422;
    throw err;
  }

  return best;
}

export async function recognizeOutfit(imageUrl, douyinUrl) {
  let result;
  try {
    result = await callGLM4V(imageUrl, RECOGNIZE_PROMPT, douyinUrl, { temperature: 0.4, maxTokens: 1024 });
  } catch (err) {
    console.error('智谱穿搭识别失败:', err.message);
    if (getApiKey()) throw err;
    result = mockAIResponse(RECOGNIZE_PROMPT);
  }

  const items = normalizeItems(result.items);
  const styleTags = result.style_tags || [];
  const matchingTips = result.matching_tips || [];
  const accessories = result.accessories || [];

  const bodyAdvice = [
    result.body_type_advice,
    result.color_harmony ? `配色：${result.color_harmony}` : '',
    result.recommendation_summary ? `推荐：${result.recommendation_summary}` : '',
  ].filter(Boolean).join(' | ');

  return {
    style: result.style || '其他',
    style_tags: styleTags,
    items,
    accessories,
    color_palette: result.color_palette || [{ name: '未知', hex: '#CCCCCC' }],
    scene: result.scene || '日常',
    season: result.season || '',
    aesthetic: result.aesthetic || '',
    body_type_advice: bodyAdvice || '通用建议：根据个人体型选择合适的尺码与版型',
    matching_tips: matchingTips,
    recommendation_score: result.recommendation_score || 0,
    recommendation_summary: result.recommendation_summary || '',
    ai_raw: result,
  };
}
