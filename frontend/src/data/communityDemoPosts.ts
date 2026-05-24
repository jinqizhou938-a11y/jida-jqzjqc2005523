import type { CommunityPost, OutfitCard } from '../types';

const DEMO_CARD_BASE = {
  source_url: 'https://v.douyin.com/demo',
  items: [{ type: '穿搭', color: '多色', detail: '示例穿搭', name: '视频同款穿搭' }],
  color_palette: [],
  body_type_advice: '',
  is_try_on_preview: true,
} satisfies Partial<OutfitCard>;

function demoCard(id: string, image: string, style: string, scene: string): OutfitCard {
  return {
    ...DEMO_CARD_BASE,
    id,
    image_url: image,
    style,
    scene,
    style_tags: [style],
    recommendation_summary: style,
    created_at: new Date().toISOString(),
  } as OutfitCard;
}

export const DEMO_COMMUNITY_DEFINITIONS: Array<{
  post: Omit<CommunityPost, 'outfit_cards'> & { username: string; caption: string };
  card: OutfitCard;
}> = [
  {
    card: demoCard('demo-card-1', '/community-demo/1.jpg', '春日休闲', '逛街'),
    post: {
      id: 'demo-post-1',
      user_id: 'demo-user-1',
      card_id: 'demo-card-1',
      username: '小雾',
      caption: '春日午后｜这套通勤也太温柔了 ☁️ 低饱和配色超显气质',
      topics: ['穿搭', '春日出街', '通勤'],
      like_count: 1284,
      comment_count: 86,
      published_at: '2026-05-20T10:00:00.000Z',
      profiles: { username: '小雾' },
    },
  },
  {
    card: demoCard('demo-card-2', '/community-demo/2.jpg', '简约通勤', '通勤'),
    post: {
      id: 'demo-post-2',
      user_id: 'demo-user-2',
      card_id: 'demo-card-2',
      username: '阿梨',
      caption: '奶油色系 OL 穿搭｜上班约会两不误，一整个高级住 ✨',
      topics: ['OL穿搭', '简约风', '即搭试穿'],
      like_count: 956,
      comment_count: 42,
      published_at: '2026-05-19T14:30:00.000Z',
      profiles: { username: '阿梨' },
    },
  },
  {
    card: demoCard('demo-card-3', '/community-demo/3.jpg', '周末出街', '逛街'),
    post: {
      id: 'demo-post-3',
      user_id: 'demo-user-3',
      card_id: 'demo-card-3',
      username: '豆豆',
      caption: '周末出门就这么穿！从抖音学来的搭配，显高又显瘦 💕',
      topics: ['周末穿搭', '抖音同款', '显瘦'],
      like_count: 2103,
      comment_count: 128,
      published_at: '2026-05-18T09:15:00.000Z',
      profiles: { username: '豆豆' },
    },
  },
  {
    card: demoCard('demo-card-4', '/community-demo/4.jpg', '度假氛围', '度假'),
    post: {
      id: 'demo-post-4',
      user_id: 'demo-user-4',
      card_id: 'demo-card-4',
      username: '南风',
      caption: '度假氛围感拉满 🏖️ 长裙+草编包，拍照超出片！',
      topics: ['度假穿搭', '氛围感', '长裙'],
      like_count: 1677,
      comment_count: 93,
      published_at: '2026-05-17T16:45:00.000Z',
      profiles: { username: '南风' },
    },
  },
];

export function getDemoCardById(cardId: string): OutfitCard | undefined {
  const def = DEMO_COMMUNITY_DEFINITIONS.find((d) => d.card.id === cardId);
  return def ? { ...def.card } : undefined;
}

export function resolveDemoCardImage(card: OutfitCard): OutfitCard {
  const demo = getDemoCardById(card.id);
  if (!demo) return card;
  return {
    ...demo,
    ...card,
    image_url: card.image_url || demo.image_url,
    source_frame_url: card.source_frame_url || demo.source_frame_url,
  };
}

export function buildDemoCommunityPosts(): CommunityPost[] {
  return DEMO_COMMUNITY_DEFINITIONS.map(({ post, card }) => ({
    ...post,
    outfit_cards: { ...card },
    profiles: { username: post.username },
  }));
}

export function isDemoPostId(id: string): boolean {
  return id.startsWith('demo-post-');
}
