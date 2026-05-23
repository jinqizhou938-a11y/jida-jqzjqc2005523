import { execFile } from 'child_process';
import { promisify } from 'util';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { fetchCoverViaHttp } from './douyinFetch.service.js';

const execFileAsync = promisify(execFile);
const cache = new NodeCache({ stdTTL: 86400 });

const YTDLP_COMMANDS = [
  ['yt-dlp'],
  ['python', '-m', 'yt_dlp'],
  ['py', '-m', 'yt_dlp'],
];

async function runYtdlp(args, timeout = 30000) {
  let lastError;
  for (const cmd of YTDLP_COMMANDS) {
    try {
      const { stdout } = await execFileAsync(cmd[0], [...cmd.slice(1), ...args], { timeout });
      return stdout;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function isYtdlpAvailable() {
  try {
    await runYtdlp(['--version'], 5000);
    return true;
  } catch {
    return false;
  }
}

/** 转为 base64 供前端持久化展示（AI 分析请用 HTTP URL） */
export async function toDataUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Referer: 'https://www.douyin.com/',
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (!mime.startsWith('image/')) return null;
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function downloadThumbnailOnly(douyinUrl) {
  const tmpDir = path.join(os.tmpdir(), `linggan-thumb-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const outPattern = path.join(tmpDir, 'thumb');
    await runYtdlp([
      '--write-thumbnail',
      '--skip-download',
      '--no-warnings',
      '-o', `${outPattern}.%(ext)s`,
      douyinUrl,
    ], 30000);

    const files = await fs.readdir(tmpDir);
    const thumbFile = files.find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (!thumbFile) return null;

    const buffer = await fs.readFile(path.join(tmpDir, thumbFile));
    const ext = path.extname(thumbFile).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function getVideoInfo(url) {
  const cached = cache.get(url);
  if (cached) return cached;

  if (await isYtdlpAvailable()) {
    try {
      const stdout = await runYtdlp(['--dump-json', '--no-download', '--no-warnings', url], 30000);
      const info = JSON.parse(stdout);
      const coverUrl = info.thumbnail || info.thumbnails?.[0]?.url || null;

      const result = {
        videoUrl: info.url || info.formats?.find((f) => f.vcodec !== 'none')?.url,
        coverUrl,
        duration: info.duration || 0,
        title: info.title || '',
      };
      cache.set(url, result);
      return result;
    } catch (err) {
      console.warn('yt-dlp 解析失败，尝试 HTTP 备用方案:', err.message?.slice(0, 80));
    }
  }

  const httpCover = await fetchCoverViaHttp(url);
  if (httpCover) {
    const result = {
      videoUrl: null,
      coverUrl: httpCover,
      duration: 15,
      title: '抖音视频',
      source: 'http',
    };
    cache.set(url, result);
    return result;
  }

  return {
    videoUrl: null,
    coverUrl: null,
    duration: 15,
    title: '抖音视频',
    mock: true,
  };
}

async function extractFramesWithFfmpeg(videoUrl) {
  const timestamps = [1, 4, 7];
  const tmpDir = path.join(os.tmpdir(), `linggan-${uuidv4()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const videoPath = path.join(tmpDir, 'video.mp4');
    await runYtdlp(['-o', videoPath, '--no-warnings', videoUrl], 60000);

    const frameUrls = [];
    for (const t of timestamps) {
      const framePath = path.join(tmpDir, `frame_${t}.jpg`);
      try {
        await execFileAsync('ffmpeg', [
          '-ss', String(t),
          '-i', videoPath,
          '-vframes', '1',
          '-vf', 'scale=640:-1',
          '-y', framePath,
        ], { timeout: 15000 });

        const buffer = await fs.readFile(framePath);
        frameUrls.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
      } catch {
        /* skip */
      }
    }

    if (frameUrls.length >= 1) {
      while (frameUrls.length < 3) frameUrls.push(frameUrls[frameUrls.length - 1]);
      return frameUrls.slice(0, 3);
    }
  } catch {
    /* fall through */
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
  return null;
}

/**
 * 返回帧列表：优先 HTTP URL（供智谱 GLM-4V-Flash 分析），同时保留可展示 URL
 */
export async function extractFrames(douyinUrl, videoUrl, coverUrl, duration) {
  let displayUrls = [];
  let aiUrls = [];

  if (videoUrl && duration >= 8) {
    const ffmpegFrames = await extractFramesWithFfmpeg(videoUrl);
    if (ffmpegFrames) {
      displayUrls = ffmpegFrames;
      // GLM-4V-Flash 不支持 base64，AI 分析用 HTTP 封面
      const httpCover = coverUrl?.startsWith('http') ? coverUrl : await fetchCoverViaHttp(douyinUrl);
      aiUrls = httpCover ? [httpCover, httpCover, httpCover] : ffmpegFrames;
    }
  }

  if (displayUrls.length === 0) {
    if (coverUrl?.startsWith('http')) {
      displayUrls = [coverUrl, coverUrl, coverUrl];
      aiUrls = [coverUrl, coverUrl, coverUrl];
    } else if (coverUrl?.startsWith('data:')) {
      displayUrls = [coverUrl, coverUrl, coverUrl];
      const httpCover = await fetchCoverViaHttp(douyinUrl);
      aiUrls = httpCover ? [httpCover, httpCover, httpCover] : displayUrls;
    }
  }

  if (displayUrls.length === 0 && await isYtdlpAvailable()) {
    const thumb = await downloadThumbnailOnly(douyinUrl);
    if (thumb) {
      displayUrls = [thumb, thumb, thumb];
      const httpCover = await fetchCoverViaHttp(douyinUrl);
      aiUrls = httpCover ? [httpCover, httpCover, httpCover] : displayUrls;
    }
  }

  if (displayUrls.length === 0) {
    const httpCover = await fetchCoverViaHttp(douyinUrl);
    if (httpCover) {
      displayUrls = [httpCover, httpCover, httpCover];
      aiUrls = [httpCover, httpCover, httpCover];
    }
  }

  if (displayUrls.length === 0) {
    throw new Error('无法获取视频截图，请检查链接是否有效。如仍失败，可安装 yt-dlp：pip install yt-dlp');
  }

  return { displayUrls, aiUrls };
}

export async function resolveHttpCover(douyinUrl) {
  return fetchCoverViaHttp(douyinUrl);
}
