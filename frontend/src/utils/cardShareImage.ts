import type { OutfitCard, OutfitItem } from '../types';

const W = 750;
const PAD = 40;
const BRAND = '#22c55e';
const BRAND_DARK = '#16a34a';
const TEXT = '#1f2937';
const MUTED = '#6b7280';

function getOutfitItems(card: OutfitCard): OutfitItem[] {
  const raw = card.ai_raw as Record<string, unknown> | undefined;
  const fromVideo = raw?.VIDEO ?? raw?.items_from_video;
  if (Array.isArray(fromVideo) && fromVideo.length > 0) {
    return fromVideo as OutfitItem[];
  }
  return card.items ?? [];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function estimateHeight(card: OutfitCard, imgH: number, urlLines: number, items: OutfitItem[]): number {
  let h = PAD;
  h += 72; // header
  h += imgH + 28;
  h += 52; // style row
  h += 44; // section title
  h += items.length * 88;
  if (card.accessories?.length) h += 44;
  h += 36 + urlLines * 30 + 24;
  h += 48; // footer
  h += PAD;
  return h;
}

export async function generateCardShareImage(card: OutfitCard): Promise<Blob> {
  const items = getOutfitItems(card);
  const imgSrc = card.image_url;
  if (!imgSrc) throw new Error('暂无试穿图片');

  const img = await loadImage(imgSrc);
  const maxImgW = W - PAD * 2;
  const maxImgH = 880;
  const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  const urlLines = wrapLines(measureCtx, card.source_url || '未知来源', W - PAD * 2 - 32);
  const canvasH = estimateHeight(card, drawH, urlLines.length, items);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('无法创建画布');

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, canvasH);
  bg.addColorStop(0, '#f0fdf4');
  bg.addColorStop(0.35, '#ffffff');
  bg.addColorStop(1, '#f9fafb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, canvasH);

  roundRect(ctx, 16, 16, W - 32, canvasH - 32, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  let y = PAD + 16;

  // brand header
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 40px "ZCOOL XiaoWei", "Noto Serif SC", "PingFang SC", serif';
  ctx.fillText('即搭', PAD + 8, y + 36);
  ctx.fillStyle = MUTED;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('灵感穿搭卡片', PAD + 108, y + 34);
  y += 72;

  // try-on image
  const imgX = (W - drawW) / 2;
  roundRect(ctx, imgX - 4, y - 4, drawW + 8, drawH + 8, 16);
  ctx.fillStyle = '#f3f4f6';
  ctx.fill();
  ctx.save();
  roundRect(ctx, imgX, y, drawW, drawH, 12);
  ctx.clip();
  ctx.drawImage(img, imgX, y, drawW, drawH);
  ctx.restore();
  y += drawH + 28;

  // style & scene
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = BRAND_DARK;
  ctx.fillText(card.style || '穿搭风格', PAD + 8, y);
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = MUTED;
  const sceneText = [card.scene, card.season].filter(Boolean).join(' · ');
  if (sceneText) {
    const sceneW = ctx.measureText(sceneText).width;
    ctx.fillText(sceneText, W - PAD - 8 - sceneW, y);
  }
  y += 52;

  // items section
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('视频穿搭单品', PAD + 8, y);
  y += 12;
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD + 8, y + 8);
  ctx.lineTo(PAD + 72, y + 8);
  ctx.stroke();
  y += 32;

  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  for (const item of items.slice(0, 8)) {
    roundRect(ctx, PAD + 4, y, W - PAD * 2 - 8, 76, 12);
    ctx.fillStyle = '#f9fafb';
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(item.type || '单品', PAD + 20, y + 28);

    ctx.fillStyle = BRAND;
    ctx.textAlign = 'right';
    ctx.fillText(item.color || '', W - PAD - 20, y + 28);
    ctx.textAlign = 'left';

    ctx.fillStyle = TEXT;
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    const name = item.name || item.detail || '';
    const nameLines = wrapLines(ctx, name, W - PAD * 2 - 40);
    ctx.fillText(nameLines[0] || '', PAD + 20, y + 56);

    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    y += 88;
  }

  if (card.accessories?.length) {
    ctx.fillStyle = MUTED;
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`配饰：${card.accessories.join('、')}`, PAD + 8, y + 24);
    y += 44;
  }

  // source url
  y += 12;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + 8, y);
  ctx.lineTo(W - PAD - 8, y);
  ctx.stroke();
  y += 28;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('穿搭来源 · 抖音', PAD + 8, y);
  y += 32;

  ctx.fillStyle = BRAND_DARK;
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  for (const line of urlLines) {
    ctx.fillText(line, PAD + 8, y);
    y += 30;
  }

  // footer
  y += 8;
  ctx.fillStyle = MUTED;
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('由即搭 AI 生成 · 穿搭来自视频关键帧', W / 2, canvasH - PAD - 12);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出图片失败'))),
      'image/png',
      1
    );
  });
}

export async function downloadCardShareImage(card: OutfitCard): Promise<void> {
  const blob = await generateCardShareImage(card);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `即搭-灵感卡片-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
