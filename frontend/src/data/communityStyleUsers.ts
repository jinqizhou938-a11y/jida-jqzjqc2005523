export interface StyleUser {
  id: string;
  username: string;
  styles: string[];
  tags: string[];
  bio: string;
  follower_count: number;
  post_count: number;
}

export const STYLE_USERS: StyleUser[] = [
  {
    id: 'demo-user-1',
    username: '小雾',
    styles: ['春日休闲', '低饱和通勤'],
    tags: ['通勤', '温柔', '春日出街'],
    bio: '偏爱奶油色与低饱和，日常通勤温柔系',
    follower_count: 1284,
    post_count: 36,
  },
  {
    id: 'demo-user-2',
    username: '阿梨',
    styles: ['简约通勤', 'OL风'],
    tags: ['OL', '简约', '职场'],
    bio: '上班约会两不误，极简高级路线',
    follower_count: 956,
    post_count: 28,
  },
  {
    id: 'demo-user-3',
    username: '豆豆',
    styles: ['周末出街', '显高显瘦'],
    tags: ['周末', '抖音同款', '显瘦'],
    bio: '从短视频学穿搭，擅长小个子显高',
    follower_count: 2103,
    post_count: 52,
  },
  {
    id: 'demo-user-4',
    username: '南风',
    styles: ['度假氛围', '长裙控'],
    tags: ['度假', '氛围感', '长裙'],
    bio: '度假拍照向，草编包与长裙是本命',
    follower_count: 1677,
    post_count: 41,
  },
  {
    id: 'demo-user-5',
    username: '柚子',
    styles: ['盐系日常', '中性风'],
    tags: ['盐系', '日常', '中性'],
    bio: '白T半裙反复穿，干净清爽盐系女孩',
    follower_count: 892,
    post_count: 24,
  },
  {
    id: 'demo-user-6',
    username: '小鹿',
    styles: ['韩系温柔', '约会穿搭'],
    tags: ['韩系', '温柔', '约会'],
    bio: '软软糯糯韩系风，约会场合不出错',
    follower_count: 1536,
    post_count: 33,
  },
  {
    id: 'demo-user-7',
    username: '拾光',
    styles: ['甜酷少女', '街头风'],
    tags: ['甜酷', '街头', '小个子'],
    bio: '短外套高腰裤，甜酷双修显高穿搭',
    follower_count: 743,
    post_count: 19,
  },
  {
    id: 'demo-user-8',
    username: '晚风',
    styles: ['极简主义', '高级感通勤'],
    tags: ['极简', '高级', '通勤'],
    bio: '三色以内不出错，Less is more',
    follower_count: 1102,
    post_count: 27,
  },
];

export const STYLE_QUICK_TAGS = [
  '通勤', '盐系', '韩系', '极简', '度假', '甜酷', 'OL', '显瘦', '温柔', '周末',
];

export function searchStyleUsers(query: string, tag?: string): StyleUser[] {
  const q = query.trim().toLowerCase();
  return STYLE_USERS.filter((user) => {
    if (tag && !user.tags.includes(tag) && !user.styles.some((s) => s.includes(tag))) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      user.username,
      user.bio,
      ...user.styles,
      ...user.tags,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
