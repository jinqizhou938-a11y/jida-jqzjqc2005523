import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut } from '../../components/Icons/Icons';
import XhsPostCard from '../../components/XhsPostCard/XhsPostCard';
import { useAuthStore } from '../../stores/authStore';
import {
  fetchFavoritePosts,
  fetchFollowedUserIds,
  fetchLikedPosts,
  toggleFollowUser,
} from '../../services/dataService';
import { STYLE_USERS } from '../../data/communityStyleUsers';
import type { CommunityPost } from '../../types';

type ProfileTab = 'following' | 'likes' | 'favorites';

const AVATAR_COLORS = ['bg-rose-100', 'bg-amber-100', 'bg-sky-100', 'bg-emerald-100', 'bg-violet-100'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<ProfileTab>('following');
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<CommunityPost[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchFollowedUserIds(user.id),
      fetchLikedPosts(user.id),
      fetchFavoritePosts(user.id),
    ])
      .then(([followed, liked, favorites]) => {
        setFollowedIds(followed);
        setLikedPosts(liked);
        setFavoritePosts(favorites);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const username = user.user_metadata?.username || user.phone || '用户';
  const displayPhone = user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';

  const followedUsers = STYLE_USERS.filter((u) => followedIds.has(u.id));

  const tabs: { key: ProfileTab; label: string; count: number }[] = [
    { key: 'following', label: '关注', count: followedUsers.length },
    { key: 'likes', label: '点赞', count: likedPosts.length },
    { key: 'favorites', label: '收藏', count: favoritePosts.length },
  ];

  const handleUnfollow = async (targetId: string) => {
    if (!user) return;
    const { following } = await toggleFollowUser(user.id, targetId);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (following) next.add(targetId);
      else next.delete(targetId);
      return next;
    });
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold text-gray-700 ${avatarColor(username)}`}
          >
            {username.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{username}</h1>
            {displayPhone && <p className="text-sm text-gray-500 mt-0.5">{displayPhone}</p>}
            <p className="text-xs text-gray-400 mt-1">即搭穿搭爱好者</p>
          </div>
        </div>
      </div>

      <div className="mx-4 bg-white/90 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`py-3 text-center transition-colors ${
                tab === item.key ? 'bg-brand-muted' : 'hover:bg-gray-50'
              }`}
            >
              <p className="text-lg font-bold text-gray-900">{item.count}</p>
              <p className={`text-xs mt-0.5 ${tab === item.key ? 'text-brand-dark font-medium' : 'text-gray-500'}`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 mt-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
        ) : tab === 'following' ? (
          followedUsers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm text-gray-500">还没有关注博主</p>
              <p className="text-xs text-gray-400">去社区「关注」页搜索风格博主吧</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {followedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3.5 bg-white/90 rounded-2xl border border-gray-100"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${avatarColor(u.username)}`}
                  >
                    {u.username.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{u.username}</p>
                    <p className="text-xs text-gray-500 truncate">{u.bio}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnfollow(u.id)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500"
                  >
                    已关注
                  </button>
                </div>
              ))}
            </div>
          )
        ) : tab === 'likes' ? (
          likedPosts.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">还没有点赞的帖子</p>
          ) : (
            <div className="columns-2 gap-3">
              {likedPosts.map((post) => (
                <XhsPostCard key={post.id} post={post} liked />
              ))}
            </div>
          )
        ) : favoritePosts.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">还没有收藏的帖子</p>
        ) : (
          <div className="columns-2 gap-3">
            {favoritePosts.map((post) => (
              <XhsPostCard key={post.id} post={post} favorited />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-8">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white/80 text-gray-600 text-sm"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </div>
  );
}
