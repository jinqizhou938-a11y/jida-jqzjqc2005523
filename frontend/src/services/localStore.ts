import type { Comment, CommunityPost, OutfitCard, WallItem } from '../types';
import {
  buildDemoCommunityPosts,
  DEMO_COMMUNITY_DEFINITIONS,
  isDemoPostId,
} from '../data/communityDemoPosts';

const STORAGE_KEY = 'jida_local_db';
const MAX_STORED_CARDS = 24;

/** 当前会话内保留完整图片，localStorage 只存文本元数据 */
const cardImageCache = new Map<string, OutfitCard>();

interface LocalDb {
  cards: Record<string, OutfitCard>;
  wall: Array<WallItem & { user_id: string; card_id: string }>;
  posts: Array<CommunityPost & { username?: string }>;
  comments: Array<Comment & { username?: string }>;
  likes: Array<{ user_id: string; post_id: string }>;
  favorites: Array<{ user_id: string; post_id: string }>;
  follows: Array<{ user_id: string; target_user_id: string }>;
}

function emptyDb(): LocalDb {
  return { cards: {}, wall: [], posts: [], comments: [], likes: [], favorites: [], follows: [] };
}

function loadDb(): LocalDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const db = { ...emptyDb(), ...JSON.parse(raw) } as LocalDb;
    if (!db.favorites) db.favorites = [];
    if (!db.follows) db.follows = [];

    let changed = false;
    for (const [id, card] of Object.entries(db.cards)) {
      const hasInlineImage =
        isDataUrl(card.image_url) ||
        isDataUrl(card.source_frame_url) ||
        (card.thumbnail_urls || []).some((url) => isDataUrl(url));
      if (hasInlineImage) {
        db.cards[id] = compactCardForStorage(card, id);
        changed = true;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch {
        pruneStoredCards(db);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } catch {
          // 仍失败则仅使用内存中的精简副本
        }
      }
    }

    return db;
  } catch {
    return emptyDb();
  }
}

function saveDb(db: LocalDb) {
  const payload = JSON.stringify(db);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    return;
  } catch (err) {
    if (!isQuotaError(err)) throw err;
  }

  pruneStoredCards(db);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return;
  } catch (err) {
    if (!isQuotaError(err)) throw err;
  }

  for (const id of Object.keys(db.cards)) {
    db.cards[id] = compactCardForStorage(db.cards[id], id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'QuotaExceededError' || err.code === 22;
}

function isDataUrl(value?: string | null): boolean {
  return Boolean(value?.startsWith('data:'));
}

function compactCardForStorage(card: OutfitCard, id = card.id): OutfitCard {
  const aiRaw = card.ai_raw || {};
  const slimAiRaw: Record<string, unknown> = {
    style_tags: card.style_tags || aiRaw.style_tags,
    accessories: card.accessories || aiRaw.accessories,
    season: card.season ?? aiRaw.season,
    aesthetic: card.aesthetic ?? aiRaw.aesthetic,
    matching_tips: card.matching_tips || aiRaw.matching_tips,
    recommendation_score: card.recommendation_score ?? aiRaw.recommendation_score,
    recommendation_summary: card.recommendation_summary ?? aiRaw.recommendation_summary,
    is_try_on_preview: card.is_try_on_preview ?? aiRaw.is_try_on_preview,
  };

  const httpThumb = (card.thumbnail_urls || []).filter((url) => url.startsWith('http'));
  const httpSource = isDataUrl(card.source_frame_url) ? undefined : card.source_frame_url;

  return {
    ...card,
    image_url: isDataUrl(card.image_url) ? '' : card.image_url,
    thumbnail_urls: httpThumb,
    source_frame_url: httpSource,
    ai_raw: slimAiRaw,
    id,
  };
}

function pruneStoredCards(db: LocalDb) {
  const referenced = new Set<string>();
  for (const w of db.wall) referenced.add(w.card_id);
  for (const p of db.posts) referenced.add(p.card_id);
  for (const demo of DEMO_COMMUNITY_DEFINITIONS) referenced.add(demo.card.id);

  const removable = Object.keys(db.cards)
    .filter((id) => !referenced.has(id))
    .sort(
      (a, b) =>
        new Date(db.cards[a].created_at || 0).getTime() -
        new Date(db.cards[b].created_at || 0).getTime()
    );

  for (const id of removable) {
    delete db.cards[id];
    cardImageCache.delete(id);
    if (Object.keys(db.cards).length <= MAX_STORED_CARDS) break;
  }
}

function rememberCard(card: OutfitCard) {
  cardImageCache.set(card.id, card);
  if (cardImageCache.size <= MAX_STORED_CARDS * 2) return;

  const oldest = [...cardImageCache.entries()].sort(
    (a, b) => new Date(a[1].created_at || 0).getTime() - new Date(b[1].created_at || 0).getTime()
  );
  while (cardImageCache.size > MAX_STORED_CARDS) {
    const [id] = oldest.shift() || [];
    if (id) cardImageCache.delete(id);
    else break;
  }
}

function hydrateCard(card: OutfitCard): OutfitCard {
  const cached = cardImageCache.get(card.id);
  const merged = cached ? { ...card, ...cached } : card;
  return cardFromStored(merged);
}

function uid() {
  return crypto.randomUUID();
}

function cardFromStored(card: OutfitCard): OutfitCard {
  const aiRaw = card.ai_raw || {};
  return {
    ...card,
    style_tags: card.style_tags || (aiRaw.style_tags as string[]) || [],
    accessories: card.accessories || (aiRaw.accessories as string[]) || [],
    is_try_on_preview: card.is_try_on_preview ?? Boolean(aiRaw.is_try_on_preview),
    source_frame_url: card.source_frame_url || (aiRaw.source_frame_url as string),
  };
}

export function saveOutfitCard(userId: string, card: OutfitCard): OutfitCard {
  const db = loadDb();
  const id = card.id || uid();
  const stored: OutfitCard = {
    ...cardFromStored(card),
    id,
    user_id: userId,
    created_at: card.created_at || new Date().toISOString(),
  };
  rememberCard(stored);
  db.cards[id] = compactCardForStorage(stored, id);
  try {
    saveDb(db);
  } catch {
    // 配额仍不足时跳过持久化，当前会话仍可展示完整卡片
  }
  return stored;
}

export function listWall(userId: string, scene?: string, q?: string): WallItem[] {
  const db = loadDb();
  let items = db.wall
    .filter((w) => w.user_id === userId)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    })
    .map((w) => ({
      id: w.id,
      note: w.note,
      is_pinned: w.is_pinned,
      saved_at: w.saved_at,
      card: hydrateCard(db.cards[w.card_id]),
    }));

  if (scene && scene !== '全部') {
    items = items.filter((item) => item.card?.scene === scene);
  }
  if (q) {
    const lower = q.toLowerCase();
    items = items.filter((item) => {
      const c = item.card;
      if (!c) return false;
      return (
        JSON.stringify(c.items || []).toLowerCase().includes(lower) ||
        (c.style || '').toLowerCase().includes(lower)
      );
    });
  }
  return items;
}

export function addToWall(userId: string, cardId: string, note?: string): WallItem {
  const db = loadDb();
  if (!db.cards[cardId]) throw new Error('卡片不存在');
  if (db.wall.some((w) => w.user_id === userId && w.card_id === cardId)) {
    throw new Error('该卡片已在灵感墙中');
  }
  const item = {
    id: uid(),
    user_id: userId,
    card_id: cardId,
    note,
    is_pinned: false,
    saved_at: new Date().toISOString(),
    card: hydrateCard(db.cards[cardId]),
  };
  db.wall.push(item);
  saveDb(db);
  return {
    id: item.id,
    note: item.note,
    is_pinned: item.is_pinned,
    saved_at: item.saved_at,
    card: item.card,
  };
}

export function updateWallItem(
  userId: string,
  wallId: string,
  updates: { note?: string; is_pinned?: boolean }
): WallItem {
  const db = loadDb();
  const idx = db.wall.findIndex((w) => w.id === wallId && w.user_id === userId);
  if (idx < 0) throw new Error('记录不存在');
  db.wall[idx] = { ...db.wall[idx], ...updates };
  saveDb(db);
  const w = db.wall[idx];
  return {
    id: w.id,
    note: w.note,
    is_pinned: w.is_pinned,
    saved_at: w.saved_at,
    card: hydrateCard(db.cards[w.card_id]),
  };
}

export function removeFromWall(userId: string, wallId: string) {
  const db = loadDb();
  db.wall = db.wall.filter((w) => !(w.id === wallId && w.user_id === userId));
  saveDb(db);
}

export function ensureDemoCommunityPosts() {
  const db = loadDb();
  const validPostIds = new Set(DEMO_COMMUNITY_DEFINITIONS.map((d) => d.post.id));
  const validCardIds = new Set(DEMO_COMMUNITY_DEFINITIONS.map((d) => d.card.id));
  let changed = false;

  const beforePosts = db.posts.length;
  db.posts = db.posts.filter((p) => !isDemoPostId(p.id) || validPostIds.has(p.id));
  if (db.posts.length !== beforePosts) changed = true;

  for (const cardId of Object.keys(db.cards)) {
    if (cardId.startsWith('demo-card-') && !validCardIds.has(cardId)) {
      delete db.cards[cardId];
      changed = true;
    }
  }

  for (const { post, card } of DEMO_COMMUNITY_DEFINITIONS) {
    if (!db.cards[card.id]) {
      db.cards[card.id] = compactCardForStorage(card, card.id);
      changed = true;
    }
    if (!db.posts.some((p) => p.id === post.id)) {
      db.posts.push({
        ...post,
        outfit_cards: card,
      } as CommunityPost & { username?: string });
      changed = true;
    }
  }

  if (changed) {
    try {
      saveDb(db);
    } catch {
      /* 配额不足时 demo 仍从定义文件展示 */
    }
  }
}

function dedupePostsByImage(posts: CommunityPost[]): CommunityPost[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    const key = p.outfit_cards?.image_url || p.card_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function listFeed(): CommunityPost[] {
  ensureDemoCommunityPosts();
  const db = loadDb();
  const demoPosts = buildDemoCommunityPosts();

  const userPosts = db.posts
    .filter((p) => !isDemoPostId(p.id))
    .slice()
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .map((p) => ({
      ...p,
      outfit_cards: hydrateCard(db.cards[p.card_id]),
      profiles: { username: p.username || p.profiles?.username || '用户' },
    }));

  return dedupePostsByImage([...demoPosts, ...userPosts]);
}

export function publishPost(
  userId: string,
  cardId: string,
  topics: string[] = [],
  username = '用户'
): CommunityPost {
  const db = loadDb();
  if (!db.cards[cardId]) throw new Error('卡片不存在');
  const post: CommunityPost & { username?: string } = {
    id: uid(),
    user_id: userId,
    card_id: cardId,
    outfit_cards: hydrateCard(db.cards[cardId]),
    topics,
    like_count: 0,
    comment_count: 0,
    published_at: new Date().toISOString(),
    profiles: { username },
    username,
  };
  db.posts.unshift(post);
  saveDb(db);
  return post;
}

export function toggleLike(userId: string, postId: string): { liked: boolean } {
  ensureDemoCommunityPosts();
  const db = loadDb();
  let post = db.posts.find((p) => p.id === postId);
  if (!post && isDemoPostId(postId)) {
    const demo = buildDemoCommunityPosts().find((p) => p.id === postId);
    if (demo) {
      db.posts.push({ ...demo, username: demo.profiles?.username } as CommunityPost & { username?: string });
      post = db.posts[db.posts.length - 1];
    }
  }
  if (!post) throw new Error('帖子不存在');
  const idx = db.likes.findIndex((l) => l.user_id === userId && l.post_id === postId);
  if (idx >= 0) {
    db.likes.splice(idx, 1);
    post.like_count = Math.max(0, post.like_count - 1);
    saveDb(db);
    return { liked: false };
  }
  db.likes.push({ user_id: userId, post_id: postId });
  post.like_count += 1;
  saveDb(db);
  return { liked: true };
}

export function toggleFavorite(userId: string, postId: string): { favorited: boolean } {
  ensureDemoCommunityPosts();
  const db = loadDb();
  if (!isDemoPostId(postId) && !db.posts.some((p) => p.id === postId)) {
    const demo = buildDemoCommunityPosts().find((p) => p.id === postId);
    if (demo) {
      db.posts.push({ ...demo, username: demo.profiles?.username } as CommunityPost & { username?: string });
    }
  }
  const idx = db.favorites.findIndex((f) => f.user_id === userId && f.post_id === postId);
  if (idx >= 0) {
    db.favorites.splice(idx, 1);
    saveDb(db);
    return { favorited: false };
  }
  db.favorites.push({ user_id: userId, post_id: postId });
  saveDb(db);
  return { favorited: true };
}

export function getFavoritedPostIds(userId: string): Set<string> {
  const db = loadDb();
  return new Set(db.favorites.filter((f) => f.user_id === userId).map((f) => f.post_id));
}

export function toggleFollowUser(userId: string, targetUserId: string): { following: boolean } {
  const db = loadDb();
  const idx = db.follows.findIndex((f) => f.user_id === userId && f.target_user_id === targetUserId);
  if (idx >= 0) {
    db.follows.splice(idx, 1);
    saveDb(db);
    return { following: false };
  }
  db.follows.push({ user_id: userId, target_user_id: targetUserId });
  saveDb(db);
  return { following: true };
}

export function getFollowedUserIds(userId: string): Set<string> {
  const db = loadDb();
  return new Set(db.follows.filter((f) => f.user_id === userId).map((f) => f.target_user_id));
}

export function listPostsByIds(postIds: string[]): CommunityPost[] {
  if (!postIds.length) return [];
  const idSet = new Set(postIds);
  return listFeed().filter((p) => idSet.has(p.id));
}

export function getLikedPosts(userId: string): CommunityPost[] {
  return listPostsByIds([...getLikedPostIds(userId)]);
}

export function getFavoritePosts(userId: string): CommunityPost[] {
  return listPostsByIds([...getFavoritedPostIds(userId)]);
}

export function listComments(postId: string): Comment[] {
  const db = loadDb();
  return db.comments
    .filter((c) => c.post_id === postId)
    .map((c) => ({
      id: c.id,
      user_id: c.user_id,
      post_id: c.post_id,
      content: c.content,
      created_at: c.created_at,
      profiles: { username: c.username || c.profiles?.username || '用户' },
    }));
}

export function addComment(
  userId: string,
  postId: string,
  content: string,
  username = '用户'
): Comment {
  const db = loadDb();
  const post = db.posts.find((p) => p.id === postId);
  if (!post) throw new Error('帖子不存在');
  const comment: Comment & { username?: string } = {
    id: uid(),
    user_id: userId,
    post_id: postId,
    content,
    created_at: new Date().toISOString(),
    profiles: { username },
    username,
  };
  db.comments.push(comment);
  post.comment_count += 1;
  saveDb(db);
  return comment;
}

export function getLikedPostIds(userId: string): Set<string> {
  const db = loadDb();
  return new Set(db.likes.filter((l) => l.user_id === userId).map((l) => l.post_id));
}

export const GUEST_USER_ID = 'guest-mvp';

export function ensureGuestUser() {
  const user = {
    id: GUEST_USER_ID,
    user_metadata: { username: '访客' },
  };
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_token', `local.${GUEST_USER_ID}`);
  return user;
}

export function loginLocalUser(phone: string, username?: string) {
  const id = `local-${phone.trim()}`;
  const user = {
    id,
    phone: phone.trim(),
    user_metadata: { username: username?.trim() || `用户${phone.slice(-4)}` },
  };
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_token', `local.${id}`);
  return user;
}

export function getLocalUser() {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; phone?: string; user_metadata?: { username?: string } };
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_token');
}
