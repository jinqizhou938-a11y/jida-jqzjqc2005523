import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserPlus, UserCheck } from '../../components/Icons/Icons';
import PageTitle from '../../components/PageTitle/PageTitle';
import OutfitCard from '../../components/OutfitCard/OutfitCard';
import XhsPostCard from '../../components/XhsPostCard/XhsPostCard';
import {
  addComment,
  fetchComments,
  fetchCommunityPosts,
  fetchFavoritedPostIds,
  fetchFollowedUserIds,
  fetchLikedPostIds,
  toggleFavorite,
  toggleFollowUser,
  toggleLike,
} from '../../services/dataService';
import { GUEST_USER_ID } from '../../services/localStore';
import { useAuthStore } from '../../stores/authStore';
import {
  searchStyleUsers,
  STYLE_QUICK_TAGS,
  type StyleUser,
} from '../../data/communityStyleUsers';
import type { CommunityPost, Comment } from '../../types';

const AVATAR_COLORS = ['bg-rose-100', 'bg-amber-100', 'bg-sky-100', 'bg-emerald-100', 'bg-violet-100'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function StyleUserRow({
  user,
  followed,
  onFollow,
}: {
  user: StyleUser;
  followed: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-white/90 rounded-2xl border border-gray-100 shadow-sm">
      <div
        className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-sm font-medium text-gray-700 ${avatarColor(user.username)}`}
      >
        {user.username.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{user.username}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{user.bio}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {user.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-muted text-brand-dark">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onFollow}
        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          followed
            ? 'bg-gray-100 text-gray-500'
            : 'bg-brand text-white shadow-sm shadow-brand/20'
        }`}
      >
        {followed ? <UserCheck size={14} /> : <UserPlus size={14} />}
        {followed ? '已关注' : '关注'}
      </button>
    </div>
  );
}

export default function CommunityPage() {
  const [tab, setTab] = useState<'feed' | 'following'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [favoritedPosts, setFavoritedPosts] = useState<Set<string>>(new Set());
  const [userQuery, setUserQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id || GUEST_USER_ID;
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'following') setTab('following');
  }, [searchParams]);

  useEffect(() => {
    fetchFollowedUserIds(userId).then(setFollowedUsers).catch(() => setFollowedUsers(new Set()));
  }, [userId]);

  useEffect(() => {
    if (tab === 'feed') fetchPosts();
    else setLoading(false);
  }, [tab]);

  const styleUsers = useMemo(
    () => searchStyleUsers(userQuery, activeTag || undefined),
    [userQuery, activeTag]
  );

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchCommunityPosts();
      setPosts(data);
      const liked = await fetchLikedPostIds(userId);
      const favorited = await fetchFavoritedPostIds(userId);
      setLikedPosts(liked);
      setFavoritedPosts(favorited);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { liked } = await toggleLike(userId, postId);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, like_count: p.like_count + (liked ? 1 : -1) } : p
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleFavorite = async (postId: string) => {
    try {
      const { favorited } = await toggleFavorite(userId, postId);
      setFavoritedPosts((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const openPost = async (post: CommunityPost) => {
    setSelectedPost(post);
    try {
      const data = await fetchComments(post.id);
      setComments(data);
    } catch {
      setComments([]);
    }
  };

  const handleComment = async () => {
    if (!selectedPost || !commentText.trim()) return;
    try {
      const data = await addComment(userId, selectedPost.id, commentText.trim(), '访客');
      setComments((prev) => [...prev, data]);
      setCommentText('');
    } catch {
      alert('评论失败');
    }
  };

  const switchTab = (next: 'feed' | 'following') => {
    setTab(next);
    if (next === 'following') {
      setSearchParams({ tab: 'following' });
    } else {
      setSearchParams({});
    }
  };

  const toggleFollow = async (id: string) => {
    try {
      const { following } = await toggleFollowUser(userId, id);
      setFollowedUsers((prev) => {
        const next = new Set(prev);
        if (following) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5 pb-2">
      <div className="space-y-4">
        <PageTitle center>社区广场</PageTitle>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => switchTab('feed')}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === 'feed' ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            发现
          </button>
          <button
            type="button"
            onClick={() => switchTab('following')}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === 'following' ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            关注
          </button>
        </div>
      </div>

      {tab === 'following' ? (
        <div className="px-3 space-y-4">
          <div className="flex items-center gap-2 bg-white/90 rounded-full border border-gray-100 pl-4 pr-2 py-1 shadow-sm">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="搜索风格或博主，如：盐系、通勤、韩系…"
              className="flex-1 py-2.5 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {STYLE_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  activeTag === tag
                    ? 'bg-brand text-white'
                    : 'bg-white/80 text-gray-600 border border-gray-100'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {styleUsers.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-16">未找到匹配风格的博主，换个关键词试试</p>
            ) : (
              styleUsers.map((user) => (
                <StyleUserRow
                  key={user.id}
                  user={user}
                  followed={followedUsers.has(user.id)}
                  onFollow={() => toggleFollow(user.id)}
                />
              ))
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 px-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="break-inside-avoid mb-3 h-64 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">还没有人发布搭配卡片</div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 px-1 max-w-5xl mx-auto">
          {posts.map((post) => (
            <XhsPostCard
              key={post.id}
              post={post}
              liked={likedPosts.has(post.id)}
              favorited={favoritedPosts.has(post.id)}
              onLike={() => handleLike(post.id)}
              onFavorite={() => handleFavorite(post.id)}
              onClick={() => openPost(post)}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <p className="font-medium text-gray-900">{selectedPost.profiles?.username || '用户'}</p>
                {selectedPost.caption && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{selectedPost.caption}</p>
                )}
              </div>
              <button type="button" onClick={() => setSelectedPost(null)} className="text-gray-400 text-2xl leading-none px-2">
                ×
              </button>
            </div>
            <div className="p-4">
              <OutfitCard card={selectedPost.outfit_cards} showActions={false} />
            </div>
            <div className="p-4 border-t space-y-3">
              <h3 className="text-sm font-medium text-gray-700">评论 ({comments.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium text-gray-700">{c.profiles?.username}: </span>
                    <span className="text-gray-600">{c.content}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleComment}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-sm"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
