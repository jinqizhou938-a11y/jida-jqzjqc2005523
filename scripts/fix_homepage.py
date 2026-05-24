# -*- coding: utf-8 -*-
from pathlib import Path

CONTENT = """import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ChevronRight } from '../../components/Icons/Icons';
import PhotoUpload from '../../components/PhotoUpload/PhotoUpload';
import GenerateProgress from '../../components/GenerateProgress/GenerateProgress';
import OutfitCard from '../../components/OutfitCard/OutfitCard';
import CardModal from '../../components/CardModal/CardModal';
import { cardsApi } from '../../services/api';
import {
  fetchWall,
  publishPost,
  saveWallItem,
} from '../../services/dataService';
import { GUEST_USER_ID, saveOutfitCard } from '../../services/localStore';
import type { OutfitCard as OutfitCardType, WallItem } from '../../types';

const STEP_MESSAGES = [
  '正在解析抖音链接...',
  '正在抽取视频画面...',
  'AI 正在挑选最佳画面...',
  '正在识别视频穿搭...',
  '正在给模特换装...',
];

function formatApiError(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
    message?: string;
    code?: string;
  };
  const status = axiosErr.response?.status;
  const apiMsg = axiosErr.response?.data?.error?.message;

  if (status === 502 || status === 503 || status === 504) {
    return '后端服务未响应或超时，请确认 backend 已启动（端口 3001）。试穿生图约需 1–3 分钟，请耐心等待';
  }
  if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.toLowerCase().includes('timeout')) {
    return '请求超时，生图耗时较长，请稍后重试';
  }
  if (!axiosErr.response && axiosErr.message?.includes('Network Error')) {
    return '无法连接后端，请在 backend 目录运行 npm run dev';
  }
  if (apiMsg) return apiMsg;
  if (err instanceof Error && !err.message.startsWith('Request failed with status code')) {
    return err.message;
  }
  return fallback;
}

function SectionTitle({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-end justify-between px-4 mb-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="h-1 w-8 bg-brand rounded-full mt-1" />
      </div>
      {link && (
        <Link to={link} className="text-xs text-gray-400 flex items-center gap-0.5">
          查看更多 <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [step, setStep] = useState(-1);
  const [card, setCard] = useState<OutfitCardType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [wallItems, setWallItems] = useState<WallItem[]>([]);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tryonRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('tryon') === '1') {
      tryonRef.current?.scrollIntoView({ behavior: 'smooth' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchWall(GUEST_USER_ID)
      .then((items) => setWallItems(items.slice(0, 6)))
      .catch(() => setWallItems([]));
  }, [card]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleParse = async () => {
    if (!url.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const { data } = await cardsApi.parseUrl(url);
      if (!data?.data?.valid) setError('仅支持抖音视频链接');
    } catch (err) {
      setError(formatApiError(err, '链接解析失败，请确认后端已启动'));
    } finally {
      setParsing(false);
    }
  };

  const handleGenerate = async () => {
    if (!userPhoto) {
      setError('请先上传试衣模特照（全身正面）');
      tryonRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!url.trim()) {
      setError('请粘贴抖音穿搭链接');
      return;
    }

    setLoading(true);
    setError(null);
    setCard(null);
    setStep(0);

    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setStep((prev) => Math.min(prev + 1, STEP_MESSAGES.length - 1));
    }, 2000);

    try {
      const { data } = await cardsApi.generate(url, userPhoto);
      if (data?.success && data.data?.card) {
        let saved = data.data.card;
        try {
          saved = saveOutfitCard(GUEST_USER_ID, data.data.card);
        } catch {
          // 本地存储配额不足时不阻断展示
        }
        setCard(saved);
        setStep(STEP_MESSAGES.length);
      } else {
        setError(data?.error?.message || '生成失败');
      }
    } catch (err) {
      setError(formatApiError(err, '生成失败，请稍后重试'));
    } finally {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;
    try {
      await saveWallItem(GUEST_USER_ID, card.id);
      showToast('已保存到灵感墙');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      showToast(msg);
    }
  };

  const handlePublish = async () => {
    if (!card) return;
    try {
      await publishPost(GUEST_USER_ID, card.id, [], '访客');
      showToast('已发布到社区');
    } catch {
      showToast('发布失败');
    }
  };

  const inspirationCards = card ? [card, ...wallItems.map((w) => w.card)] : wallItems.map((w) => w.card);

  return (
    <div className="pb-4">
      <header className="flex items-center justify-center px-4 pt-5 pb-4 min-h-[56px]">
        <div className="flex flex-col items-center gap-1">
          <h1 className="brand-wordmark">即搭</h1>
          <svg className="w-10 h-2.5 text-brand/70" viewBox="0 0 48 8" fill="none" aria-hidden>
            <path d="M2 6c8-5 16-5 24-2s16 1 22-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </header>

      <div className="px-4 mb-4">
        <div className="flex gap-2 items-center bg-gray-50 rounded-full border border-gray-100 pl-4 pr-1 py-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴抖音链接/口令"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || loading || !url.trim()}
            className="px-4 py-2 rounded-full bg-brand text-white text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {parsing ? '解析中' : '解析'}
          </button>
        </div>
      </div>

      <div ref={tryonRef} className="px-4 mb-6 space-y-3">
        <p className="text-xs text-gray-500 px-1">上传全身照作为试衣模特，穿搭将从视频关键帧提取</p>
        <PhotoUpload value={userPhoto} onChange={setUserPhoto} disabled={loading} compact />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !url.trim() || !userPhoto}
          className="w-full py-3.5 rounded-full bg-brand text-white font-medium text-sm disabled:opacity-50 shadow-md shadow-brand/20"
        >
          {loading ? '换装生成中...' : '生成视频穿搭试穿'}
        </button>
      </div>

      {loading && step >= 0 && (
        <div className="px-4 mb-4">
          <GenerateProgress currentStep={step} message={STEP_MESSAGES[step]} />
        </div>
      )}

      {error && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">{error}</div>
      )}

      <section className="mb-6">
        <SectionTitle title="灵感卡片" link="/wall" />
        {inspirationCards.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">生成第一张穿搭卡片吧</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {inspirationCards.map((c) => (
              <div key={c.id} className="shrink-0 w-[140px]">
                <OutfitCard card={c} variant="compact" onClick={() => { setCard(c); setModalOpen(true); }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {card && !loading && (
        <section className="px-4 mb-6">
          <SectionTitle title="试穿预览" />
          <p className="text-xs text-brand mb-2 px-1">穿搭来自视频关键帧 · 模特来自您的照片</p>
          <OutfitCard
            card={card}
            showActions
            onSave={handleSave}
            onPublish={handlePublish}
            onClick={() => setModalOpen(true)}
            onExportSuccess={() => showToast('图片已保存到本地')}
            onExportError={(msg) => showToast(msg)}
          />
        </section>
      )}

      {card && (
        <CardModal open={modalOpen} onClose={() => setModalOpen(false)} title="搭配详情">
          <OutfitCard
            card={card}
            showActions={false}
            onExportSuccess={() => showToast('图片已保存到本地')}
            onExportError={(msg) => showToast(msg)}
          />
        </CardModal>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
"""

CONTENT = CONTENT.replace("<motion.div", "<div").replace("</motion.div>", "</div>")

path = Path(r"d:\Desktop\灵感衣橱\frontend\src\pages\Home\HomePage.tsx")
path.write_text(CONTENT, encoding="utf-8")
print("ok", path)
