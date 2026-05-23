# 即搭 · 灵感衣橱

抖音穿搭试穿 → 搭配卡片 → 灵感墙 → 社区分享

## 功能概览

- **试穿生成**（核心）：粘贴抖音链接 + 上传全身照，AI 从视频关键帧提取穿搭并试穿
- **穿搭顾问**（核心）：按城市天气推荐穿搭（`/advisor`）
- **灵感墙 / 社区 / 登录 / 我的**（UI 框架）：演示数据 + 浏览器 `localStorage`，无需数据库

## 技术栈

| 层级 | 技术 |
|-----|------|
| 前端 | React + Vite + TailwindCSS 4 + Zustand |
| 后端 | Node.js + Express（仅 AI 试穿生图） |
| 演示数据 | 浏览器 `localStorage` |
| AI | 智谱 GLM-4V（识图）+ 通义万相 Wan2.7-Image-Pro（试穿） |

## 快速开始

### 环境准备

- Node.js 20+
- FFmpeg、yt-dlp
- 智谱 AI Key、DashScope Key（试穿功能）

### 启动

```bash
# 后端（试穿生图）
cd backend
cp .env.example .env   # 填入 ZHIPU_API_KEY、DASHSCOPE_API_KEY
npm install
npm run dev            # http://localhost:3001

# 前端
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

### 环境变量

**backend/.env** — 仅需 AI 相关密钥（见 `.env.example`）

**frontend/.env**

```env
VITE_API_URL=/api/v1
```

## 部署说明

| 模式 | 说明 |
|------|------|
| 完整功能 | 前端 `dist/` + 后端 Node 服务（Nginx 反代 `/api` → 3001） |
| 仅前端 | 只上传 `dist/`，社区/墙/登录可用，**试穿生图不可用** |

社区、灵感墙、登录等数据保存在用户浏览器 `localStorage`，不依赖后端数据库。

## 用户流程

1. **首页生成试穿** → 粘贴抖音链接 + 上传全身照 → 生成卡片
2. **穿搭顾问** → `/advisor` 查看天气推荐
3. **保存灵感墙** → 卡片上点击「保存」→ `/wall` 查看（本地演示）
4. **社区 / 我的** → 浏览 demo 帖、本地登录演示

## 项目结构

```
灵感衣橱/
├── frontend/src/
│   ├── pages/Home/       # 试穿生图
│   ├── pages/Advisor/    # 穿搭顾问
│   ├── pages/Wall/       # 灵感墙（演示）
│   ├── pages/Community/  # 社区（演示）
│   ├── services/localStore.ts  # 本地演示数据
│   └── services/api.ts   # 后端 cards API
└── backend/src/
    ├── routes/cards.routes.js
    └── services/         # 抖音解析 + AI 识图 + 试穿生图
```

## License

MIT
