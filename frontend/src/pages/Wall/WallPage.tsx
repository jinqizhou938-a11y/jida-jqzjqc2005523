import { useEffect, useState, useCallback } from 'react';
import PageTitle from '../../components/PageTitle/PageTitle';
import OutfitCard from '../../components/OutfitCard/OutfitCard';
import CardModal from '../../components/CardModal/CardModal';
import {
  fetchWall,
  publishPost,
  removeWallItem,
  updateWall,
} from '../../services/dataService';
import { GUEST_USER_ID } from '../../services/localStore';
import { SCENE_OPTIONS } from '../../types';
import type { WallItem } from '../../types';

export default function WallPage() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scene, setScene] = useState('全部');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WallItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const userId = GUEST_USER_ID;

  const fetchWallItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: { scene?: string; q?: string } = {};
      if (scene !== '全部') params.scene = scene;
      if (query) params.q = query;
      const data = await fetchWall(userId, params);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scene, query]);

  useEffect(() => {
    fetchWallItems();
  }, [fetchWallItems]);

  const handleDelete = async (id: string) => {
    try {
      await removeWallItem(userId, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    } catch {
      /* ignore */
    }
  };

  const handlePin = async (item: WallItem) => {
    try {
      await updateWall(userId, item.id, { is_pinned: !item.is_pinned });
      fetchWallItems();
    } catch {
      /* ignore */
    }
  };

  const handleSaveNote = async (note: string) => {
    if (!selected) return;
    await updateWall(userId, selected.id, { note });
    fetchWallItems();
  };

  const handlePublish = async (cardId: string) => {
    try {
      await publishPost(userId, cardId, [], '访客');
      alert('已发布到社区');
    } catch {
      alert('发布失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageTitle>灵感墙</PageTitle>
        <input
          type="search"
          placeholder="搜索风格、单品..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-4 py-2 rounded-full border border-gray-100 text-sm outline-none focus:border-brand w-full md:w-64"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENE_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScene(s)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              scene === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand/30'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <span className="text-6xl">📌</span>
          <p className="text-gray-500">还没有保存的搭配</p>
          <p className="text-sm text-gray-400">去首页生成并保存你的第一张卡片</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              {item.is_pinned && (
                <span className="absolute -top-2 -right-2 z-10 text-lg">📌</span>
              )}
              <OutfitCard
                card={item.card}
                note={item.note}
                showActions
                onPublish={() => handlePublish(item.card.id)}
                onClick={() => setSelected(item)}
              />
              <div className="flex gap-2 mt-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handlePin(item)}
                  className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {item.is_pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(item.id)}
                  className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <CardModal
          open={!!selected}
          onClose={() => setSelected(null)}
          note={selected.note}
          onSaveNote={handleSaveNote}
        >
          <OutfitCard card={selected.card} showActions={false} />
        </CardModal>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <p className="text-gray-800 font-medium">确认删除这张卡片？</p>
            <p className="text-sm text-gray-500">此操作不可撤销</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
