import type { CommunityPost } from '../../types';

interface XhsPostCardProps {
  post: CommunityPost;
  liked?: boolean;
  favorited?: boolean;
  onLike?: () => void;
  onFavorite?: () => void;
  onClick?: () => void;
}

const AVATAR_COLORS = ['bg-rose-100', 'bg-amber-100', 'bg-sky-100', 'bg-emerald-100', 'bg-violet-100'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function XhsPostCard({ post, liked, favorited, onLike, onFavorite, onClick }: XhsPostCardProps) {
  const card = post.outfit_cards;
  const username = post.profiles?.username || '用户';
  const caption =
    post.caption ||
    card.recommendation_summary ||
    `${card.style} · ${card.scene}穿搭分享`;

  return (
    <article
      className="break-inside-avoid mb-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/90 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="relative bg-gray-50">
        <img
          src={card.image_url}
          alt=""
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      <div className="p-2.5 space-y-2">
        <p className="text-[13px] text-gray-900 font-medium line-clamp-2 leading-snug">{caption}</p>

        {post.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.topics.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-brand-dark/80">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-medium text-gray-600 ${avatarColor(username)}`}
            >
              {username.slice(0, 1)}
            </div>
            <span className="text-[11px] text-gray-500 truncate">{username}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.();
              }}
              className={`flex items-center text-[11px] ${favorited ? 'text-amber-500' : 'text-gray-400'}`}
              aria-label={favorited ? '已收藏' : '收藏'}
            >
              {favorited ? '⭐' : '☆'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.();
              }}
              className={`flex items-center gap-0.5 text-[11px] ${liked ? 'text-rose-500' : 'text-gray-400'}`}
            >
              {liked ? '❤️' : '🤍'}
              <span>{post.like_count}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
