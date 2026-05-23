import * as localStore from './localStore';
import type { Comment, CommunityPost, WallItem } from '../types';

export async function fetchWall(
  userId: string,
  params?: { scene?: string; q?: string }
): Promise<WallItem[]> {
  return localStore.listWall(userId, params?.scene, params?.q);
}

export async function saveWallItem(userId: string, cardId: string, note?: string): Promise<WallItem> {
  return localStore.addToWall(userId, cardId, note);
}

export async function updateWall(
  userId: string,
  wallId: string,
  updates: { note?: string; is_pinned?: boolean }
): Promise<WallItem> {
  return localStore.updateWallItem(userId, wallId, updates);
}

export async function removeWallItem(userId: string, wallId: string): Promise<void> {
  localStore.removeFromWall(userId, wallId);
}

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  return localStore.listFeed();
}

export async function publishPost(
  userId: string,
  cardId: string,
  topics: string[] = [],
  username?: string
): Promise<CommunityPost> {
  return localStore.publishPost(userId, cardId, topics, username);
}

export async function toggleLike(userId: string, postId: string): Promise<{ liked: boolean }> {
  return localStore.toggleLike(userId, postId);
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  return localStore.listComments(postId);
}

export async function addComment(
  userId: string,
  postId: string,
  content: string,
  username?: string
): Promise<Comment> {
  return localStore.addComment(userId, postId, content, username);
}

export async function fetchLikedPostIds(userId: string): Promise<Set<string>> {
  return localStore.getLikedPostIds(userId);
}

export async function fetchFavoritedPostIds(userId: string): Promise<Set<string>> {
  return localStore.getFavoritedPostIds(userId);
}

export async function toggleFavorite(userId: string, postId: string): Promise<{ favorited: boolean }> {
  return localStore.toggleFavorite(userId, postId);
}

export async function fetchLikedPosts(userId: string): Promise<CommunityPost[]> {
  return localStore.getLikedPosts(userId);
}

export async function fetchFavoritePosts(userId: string): Promise<CommunityPost[]> {
  return localStore.getFavoritePosts(userId);
}

export async function fetchFollowedUserIds(userId: string): Promise<Set<string>> {
  return localStore.getFollowedUserIds(userId);
}

export async function toggleFollowUser(userId: string, targetUserId: string): Promise<{ following: boolean }> {
  return localStore.toggleFollowUser(userId, targetUserId);
}
