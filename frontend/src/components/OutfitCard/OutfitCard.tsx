import { useEffect, useState } from 'react';
import type { OutfitCard as OutfitCardType, OutfitItem } from '../../types';
import { getDemoCardById } from '../../data/communityDemoPosts';
import { downloadCardShareImage } from '../../utils/cardShareImage';

const SCENE_ICONS: Record<string, string> = {
  通勤: '💼',
  约会: '💕',
  逛街: '🛍️',
  运动: '🏃',
  度假: '🏖️',
  日常: '☀️',
};

function enrichCard(card: OutfitCardType): OutfitCardType {
  const raw = card.ai_raw as Record<string, unknown> | undefined;
  const demoUrl = getDemoCardById(card.id)?.image_url;
  return {
    ...card,
    ...(demoUrl && !card.image_url ? { image_url: demoUrl } : {}),
    style_tags: card.style_tags || (raw?.style_tags as string[]) || [],
    accessories: card.accessories || (raw?.accessories as string[]) || [],
    season: card.season || (raw?.season as string) || '',
    aesthetic: card.aesthetic || (raw?.aesthetic as string) || '',
    matching_tips: card.matching_tips || (raw?.matching_tips as string[]) || [],
    recommendation_score: card.recommendation_score ?? (raw?.recommendation_score as number),
    recommendation_summary: card.recommendation_summary || (raw?.recommendation_summary as string) || '',
    is_try_on_preview: card.is_try_on_preview ?? (raw?.is_try_on_preview as boolean),
    source_frame_url: card.source_frame_url || (raw?.source_frame_url as string),
  };
}

function getItemsFromVideo(card: OutfitCardType): OutfitItem[] {
  const raw = card.ai_raw as Record<string, unknown> | undefined;
  const fromVideo = raw?.VIDEO;
  if (Array.isArray(fromVideo) && fromVideo.length > 0) {
    return fromVideo as OutfitItem[];
  }
  return card.items ?? [];
}

interface OutfitCardProps {
  card: OutfitCardType;
  note?: string;
  variant?: 'default' | 'compact';
  showActions?: boolean;
  liked?: boolean;
  likeCount?: number;
  onSave?: () => void;
  onPublish?: () => void;
  onLike?: () => void;
  onClick?: () => void;
  onExportSuccess?: () => void;
  onExportError?: (message: string) => void;
}

function resolveImageCandidates(card: OutfitCardType, view: 'tryon' | 'video'): string[] {
  const demoUrl = getDemoCardById(card.id)?.image_url;
  const tryOnUrl = card.image_url || demoUrl;
  const sourceFrameUrl = card.source_frame_url || card.thumbnail_urls?.[0];
  const primary = view === 'tryon' ? tryOnUrl : sourceFrameUrl;
  const secondary = view === 'tryon' ? sourceFrameUrl : tryOnUrl;
  return [primary, secondary, demoUrl].filter((url, i, arr): url is string => Boolean(url) && arr.indexOf(url) === i);
}

function CardImage({ card, compact }: { card: OutfitCardType; compact?: boolean }) {
  const tryOnUrl = card.image_url || getDemoCardById(card.id)?.image_url;
  const sourceFrameUrl = card.source_frame_url || card.thumbnail_urls?.[0];

  const [view, setView] = useState<'tryon' | 'video'>('tryon');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const candidates = resolveImageCandidates(card, view);
  const src = candidates[candidateIndex];
  const canToggle = Boolean(tryOnUrl && sourceFrameUrl);

  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
  }, [card.id, view, tryOnUrl, sourceFrameUrl]);

  return (
    <div
      className={`relative w-full bg-gradient-to-br from-brand-muted to-white overflow-hidden flex items-center justify-center ${
        compact ? 'min-h-[200px] max-h-[260px]' : 'min-h-[360px] max-h-[520px]'
      }`}
    >
      {!failed && src ? (
        <img
          src={src}
          alt=""
          className={`max-w-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] ${
            compact ? 'max-h-[260px]' : 'max-h-[520px]'
          }`}
          loading="lazy"
          onError={() => {
            if (candidateIndex + 1 < candidates.length) {
              setCandidateIndex((i) => i + 1);
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <div className="w-full h-60 flex flex-col items-center justify-center text-gray-400 gap-2">
          <span className="text-4xl">👗</span>
          <span className="text-xs">图片加载失败</span>
        </div>
      )}

      {canToggle && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setView('tryon');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
              view === 'tryon' ? 'bg-brand text-white' : 'bg-white/90 text-gray-600'
            }`}
          >
            试穿预览
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setView('video');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
              view === 'video' ? 'bg-brand text-white' : 'bg-white/90 text-gray-600'
            }`}
          >
            视频穿搭
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 pt-8">
        <div className="flex items-end justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/95 text-brand-dark shadow-sm">
            {card.style}
          </span>
          <span className="px-2 py-1 rounded-full text-xs bg-white/95 text-gray-700 shadow-sm">
            {SCENE_ICONS[card.scene] || '👔'} {card.scene}
            {card.season ? ` · ${card.season}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OutfitCard({
  card: rawCard,
  note,
  variant = 'default',
  showActions = true,
  liked,
  likeCount,
  onSave,
  onPublish,
  onLike,
  onClick,
  onExportSuccess,
  onExportError,
}: OutfitCardProps) {
  const card = enrichCard(rawCard);
  const tags = card.style_tags || [];
  const videoItems = getItemsFromVideo(card);
  const [exporting, setExporting] = useState(false);

  const handleExportImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.image_url || exporting) return;
    setExporting(true);
    try {
      await downloadCardShareImage(card);
      onExportSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存图片失败';
      onExportError?.(msg);
    } finally {
      setExporting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div
        className="group w-full max-w-[140px] bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-shadow hover:shadow-xl"
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <CardImage card={card} compact />
      </div>
    );
  }

  return (
    <div
      className="group w-full max-w-[360px] bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-shadow hover:shadow-xl"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <CardImage card={card} />

      <div className="p-4 space-y-3">
        {card.aesthetic && (
          <p className="text-xs text-gray-500 italic leading-relaxed">{card.aesthetic}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand-dark">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {videoItems.map((item, i) => (
            <div key={i} className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">{item.type}</span>
                <span className="text-xs text-brand">{item.color}</span>
              </div>
              <p className="text-xs text-gray-800 mt-0.5 font-medium">{item.name || item.detail}</p>
              {(item.material || item.fit || item.pattern) && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {[item.material, item.fit, item.pattern].filter(Boolean).join(' · ')}
                </p>
              )}
              {item.style_detail && item.style_detail !== item.name && (
                <p className="text-[11px] text-gray-400 mt-0.5">{item.style_detail}</p>
              )}
            </div>
          ))}
        </div>

        {card.accessories && card.accessories.length > 0 && (
          <p className="text-xs text-gray-500">🎒 配饰：{card.accessories.join('、')}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {card.color_palette?.slice(0, 6).map((color, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-5 h-5 rounded-md border border-gray-100 shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
              <span className="text-[10px] text-gray-400">{color.name}</span>
            </div>
          ))}
        </div>

        {card.recommendation_summary && (
          <div className="rounded-lg bg-brand-muted px-3 py-2 border border-brand-light">
            <p className="text-xs text-brand-dark">
              ✨ 视频穿搭推荐
              {card.recommendation_score ? ` ${card.recommendation_score}/10 · ` : ' · '}
              {card.recommendation_summary}
            </p>
          </div>
        )}

        {card.matching_tips && card.matching_tips.length > 0 && (
          <ul className="text-[11px] text-gray-500 space-y-0.5 list-disc list-inside">
            {card.matching_tips.slice(0, 3).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}

        {card.body_type_advice && (
          <p className="text-xs text-gray-500 line-clamp-3 border-t border-gray-50 pt-2">
            💡 {card.body_type_advice}
          </p>
        )}

        {note && (
          <p className="text-xs text-brand-dark italic border-t border-brand-light pt-2">📝 {note}</p>
        )}

        {(showActions || card.image_url) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="flex gap-2 flex-wrap">
              {card.image_url && (
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={exporting}
                  className="text-sm px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  {exporting ? '生成中…' : '📥 保存图片'}
                </button>
              )}
              {showActions && onSave && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  className="text-sm px-3 py-1.5 rounded-full bg-brand-muted text-brand-dark hover:bg-brand-light"
                >
                  ⭐ 保存
                </button>
              )}
              {showActions && onPublish && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish();
                  }}
                  className="text-sm px-3 py-1.5 rounded-full bg-brand-light text-brand-dark hover:bg-brand-muted"
                >
                  🌐 发布
                </button>
              )}
            </div>
            {showActions && onLike && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                className={`text-sm px-3 py-1.5 rounded-full ${
                  liked ? 'bg-brand-light text-brand-dark' : 'bg-gray-50 text-gray-500 hover:bg-brand-muted'
                }`}
              >
                {liked ? '❤️' : '🤍'} {likeCount ?? 0}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

