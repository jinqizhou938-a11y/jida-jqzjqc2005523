# 灵感衣橱 — 开发规格文档 (SPEC)

**版本：** v1.0  
**更新日期：** 2026-05-23  
**关联文档：** [PRD.md](./PRD.md)

---

## 1. 技术架构

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器 (React SPA)                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js + Express 后端                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ 解析模块  │  │ 抽帧模块  │  │ AI 模块  │  │ 社区/卡片 API    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
   ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌──────────────┐
   │ yt-dlp  │   │ FFmpeg  │   │ GLM-4V   │   │   Supabase   │
   │ (CLI)   │   │ (CLI)   │   │   API    │   │ PG+Auth+Storage│
   └─────────┘   └─────────┘   └──────────┘   └──────────────┘
```

### 1.2 技术栈明细

| 层级 | 技术 | 版本 | 用途 |
|-----|------|------|------|
| 前端框架 | React | 18.x | UI 渲染 |
| 构建工具 | Vite | 5.x | 开发/打包 |
| 样式 | TailwindCSS | 3.x | 原子化 CSS |
| UI 组件 | Headless UI | 2.x | 无样式交互组件 |
| 状态管理 | Zustand | 4.x | 全局状态 |
| HTTP | Axios | 1.x | API 请求 |
| 懒加载 | react-lazyload | 3.x | 图片懒加载 |
| 后端运行时 | Node.js | 20.x | 服务端 |
| Web 框架 | Express | 4.x | REST API |
| 数据库 | Supabase (PostgreSQL) | - | 数据持久化 |
| 认证 | Supabase Auth | - | 用户认证 |
| 文件存储 | Supabase Storage | - | 缩略图/图片 |
| 视频解析 | yt-dlp | latest | 抖音视频地址 |
| 视频处理 | FFmpeg | 6.x | 抽帧 |
| AI 视觉 | 智谱 GLM-4V | - | 图片识别 |
| 缓存 | node-cache | 5.x | 解析结果缓存 24h |

### 1.3 目录结构

```
灵感衣橱/
├── docs/
│   ├── PRD.md                 # 产品需求文档
│   └── SPEC.md                # 开发规格文档（本文件）
├── frontend/                  # React 前端
│   ├── public/
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   │   ├── Layout/
│   │   │   ├── OutfitCard/
│   │   │   ├── LinkInput/
│   │   │   └── ...
│   │   ├── pages/             # 页面
│   │   │   ├── Home/
│   │   │   ├── InspirationWall/
│   │   │   ├── Community/
│   │   │   ├── Auth/
│   │   │   └── Admin/
│   │   ├── stores/            # Zustand stores
│   │   ├── services/          # API 封装
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                   # Node.js 后端
│   ├── src/
│   │   ├── routes/            # 路由
│   │   ├── controllers/       # 控制器
│   │   ├── services/          # 业务逻辑
│   │   │   ├── douyin.service.js
│   │   │   ├── ffmpeg.service.js
│   │   │   ├── ai.service.js
│   │   │   └── card.service.js
│   │   ├── middleware/        # 中间件
│   │   ├── utils/
│   │   └── app.js
│   ├── package.json
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── README.md
└── .gitignore
```

---

## 2. 数据库设计

### 2.1 ER 关系

```
users (Supabase Auth)
  │
  ├── profiles (1:1)
  │
  ├── outfit_cards (1:N) ── saved_by ──> inspiration_wall (N:M)
  │
  ├── community_posts (1:N)
  │
  ├── likes (N:M community_posts)
  │
  ├── comments (1:N community_posts)
  │
  ├── follows (N:M users)
  │
  └── reports (1:N community_posts)
```

### 2.2 表结构

#### profiles（用户资料，扩展 auth.users）

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### outfit_cards（搭配卡片）

```sql
CREATE TABLE outfit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,           -- 原始抖音链接
  image_url TEXT NOT NULL,            -- 最佳帧图片 URL
  thumbnail_urls TEXT[],              -- 3 张抽帧 URL
  style TEXT,                         -- 风格标签
  items JSONB NOT NULL DEFAULT '[]',  -- 单品列表
  color_palette JSONB NOT NULL DEFAULT '[]',
  scene TEXT,                         -- 场景
  body_type_advice TEXT,
  ai_raw JSONB,                       -- AI 原始返回
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### inspiration_wall（灵感墙，用户保存的卡片）

```sql
CREATE TABLE inspiration_wall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES outfit_cards(id) ON DELETE CASCADE,
  note TEXT,                          -- 私人笔记
  is_pinned BOOLEAN DEFAULT FALSE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);
```

#### community_posts（社区发布）

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES outfit_cards(id) ON DELETE CASCADE,
  topics TEXT[] DEFAULT '{}',         -- 话题标签 #夏日穿搭
  visibility TEXT DEFAULT 'public',   -- public | friends (MVP 仅 public)
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,    -- 审核隐藏
  published_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### likes（点赞）

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
```

#### comments（评论）

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### follows（关注）

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);
```

#### reports（举报）

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending | resolved | dismissed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 RLS 策略（Row Level Security）

| 表 | 策略 |
|---|------|
| profiles | 公开可读；仅本人可更新 |
| outfit_cards | 创建者可读写；关联灵感墙/社区帖子的可读 |
| inspiration_wall | 仅本人 CRUD |
| community_posts | 公开且未隐藏的可读；仅本人可发布/删除 |
| likes | 登录用户可增删自己的；公开可读计数 |
| comments | 公开可读；登录用户可创建自己的 |
| follows | 仅本人 CRUD |
| reports | 仅本人可创建；管理员可读 |

### 2.4 索引

```sql
CREATE INDEX idx_outfit_cards_user_id ON outfit_cards(user_id);
CREATE INDEX idx_outfit_cards_scene ON outfit_cards(scene);
CREATE INDEX idx_inspiration_wall_user_id ON inspiration_wall(user_id);
CREATE INDEX idx_inspiration_wall_pinned ON inspiration_wall(user_id, is_pinned DESC, saved_at DESC);
CREATE INDEX idx_community_posts_published ON community_posts(published_at DESC) WHERE is_hidden = FALSE;
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'pending';
```

---

## 3. API 设计

**Base URL:** `/api/v1`  
**认证:** Bearer Token (Supabase JWT)，Header: `Authorization: Bearer <token>`

### 3.1 卡片生成

#### POST /cards/generate

从抖音链接生成搭配卡片（核心流程）。

**Request:**
```json
{
  "url": "https://v.douyin.com/xxx"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "card": {
      "id": "uuid",
      "image_url": "https://...",
      "style": "韩系清冷",
      "items": [{"type": "上衣", "color": "白色", "detail": "印花T恤"}],
      "color_palette": [{"name": "奶油白", "hex": "#FFF5E6"}],
      "scene": "通勤",
      "body_type_advice": "..."
    },
    "progress": {
      "steps": ["parse", "extract", "select", "recognize"],
      "completed": true
    }
  }
}
```

**SSE 进度流（可选）:** `GET /cards/generate/stream?url=...`

**Errors:**
| Code | 说明 |
|------|------|
| 400 | 无效抖音链接 |
| 422 | 穿搭不明显（AI 得分 < 5） |
| 500 | 解析/抽帧/AI 失败 |

---

#### POST /cards/parse-url

仅解析并验证抖音链接（前端实时校验）。

**Request:** `{ "input": "复制打开抖音..." }`  
**Response:** `{ "valid": true, "url": "https://v.douyin.com/xxx" }`

---

### 3.2 灵感墙

| Method | Path | 说明 | Auth |
|--------|------|------|------|
| GET | /wall | 获取灵感墙列表（支持 scene、q 筛选） | Required |
| POST | /wall | 保存卡片到灵感墙 | Required |
| PATCH | /wall/:id | 更新笔记/置顶 | Required |
| DELETE | /wall/:id | 从灵感墙移除 | Required |

**GET /wall Query:** `?scene=通勤&q=白色&page=1&limit=20`

**Response:**
```json
{
  "data": [
    {
      "id": "wall-uuid",
      "card": { /* outfit_card */ },
      "note": "私人笔记",
      "is_pinned": false,
      "saved_at": "2026-05-23T..."
    }
  ],
  "total": 42,
  "page": 1
}
```

---

### 3.3 社区

| Method | Path | 说明 | Auth |
|--------|------|------|------|
| GET | /community/feed | 广场动态（公开卡片） | Optional |
| GET | /community/following | 关注用户动态 | Required |
| POST | /community/posts | 发布卡片到社区 | Required |
| DELETE | /community/posts/:id | 删除自己的发布 | Required |
| POST | /community/posts/:id/like | 点赞/取消点赞 | Required |
| GET | /community/posts/:id/comments | 获取评论 | Optional |
| POST | /community/posts/:id/comments | 发表评论 | Required |
| POST | /community/posts/:id/report | 举报 | Required |

**GET /community/feed Query:** `?page=1&limit=20`

---

### 3.4 用户

| Method | Path | 说明 | Auth |
|--------|------|------|------|
| GET | /users/:id/profile | 用户主页 | Optional |
| GET | /users/:id/posts | 用户发布的卡片 | Optional |
| POST | /users/:id/follow | 关注/取消关注 | Required |

---

### 3.5 管理

| Method | Path | 说明 | Auth |
|--------|------|------|------|
| GET | /admin/reports | 待审核举报列表 | Admin |
| PATCH | /admin/posts/:id/hide | 隐藏/恢复帖子 | Admin |

---

## 4. 核心模块实现规格

### 4.1 抖音链接解析 (douyin.service.js)

```javascript
// 输入清洗
function extractDouyinUrl(input) {
  // 1. 正则匹配 v.douyin.com/xxx 或 www.douyin.com/video/xxx
  // 2. 从口令文本中提取 URL
  // 3.  ")
}

// 视频信息获取（yt-dlp）
async function getVideoInfo(url) {
  // yt-dlp --dump-json --no-download <url>
  // return { videoUrl, coverUrl, duration, title }
}
```

**缓存:** node-cache，key = url，TTL = 86400 (24h)

**依赖:** 系统需安装 `yt-dlp`（`pip install yt-dlp` 或下载二进制）

---

### 4.2 视频抽帧 (ffmpeg.service.js)

```javascript
async function extractFrames(videoUrl, timestamps = [1, 4, 7]) {
  // 1. 下载视频到临时目录（或 stream）
  // 2. 对每个 timestamp: ffmpeg -ss {t} -i video.mp4 -vframes 1 -vf scale=640:-1 frame_{t}.jpg
  // 3. 上传至 Supabase Storage bucket: thumbnails
  // 4. return [url1, url2, url3]
}

async function extractFramesWithFallback(videoUrl, coverUrl, duration) {
  if (duration < 8) return [coverUrl, coverUrl, coverUrl];
  try {
    return await extractFrames(videoUrl);
  } catch {
    return [coverUrl, coverUrl, coverUrl];
  }
}
```

**Storage 路径:** `thumbnails/{uuid}/{timestamp}.jpg`

---

### 4.3 AI 服务 (ai.service.js)

#### 择优 Prompt

```
分析这张图片中人物的穿搭展示效果。
返回 JSON（不要其他文字）：
{
  "completeness_score": 0-10,
  "full_body_visible": true/false,
  "reason": "简短说明"
}
```

#### 识别 Prompt

```
你是一位时尚搭配专家。分析图中人物穿搭，返回以下 JSON，不要其他文字：
{
  "style": "韩系清冷/Y2K/日系文艺/其他",
  "items": [{"type":"上衣","color":"白色","detail":"印花T恤"}],
  "color_palette": [{"name":"奶油白","hex":"#FFF5E6"}],
  "scene": "通勤/约会/逛街/运动/度假",
  "body_type_advice": "体型适配建议"
}
```

**API 调用:**
```javascript
// 智谱 GLM-4V
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4v',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }]
  })
});
```

**择优逻辑:**
- 3 张图并发调用
- 取得分最高且 score >= 5 的图
- 若全部 < 5，抛出 422 错误

---

### 4.4 评论限流

```javascript
// middleware/rateLimit.js
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user.id,
  message: { error: '评论过于频繁，请稍后再试' }
});
```

---

## 5. 前端规格

### 5.1 路由

| Path | 页面 | 权限 |
|------|------|------|
| `/` | 首页（生成卡片） | 公开 |
| `/wall` | 灵感墙 | 需登录 |
| `/community` | 社区广场 | 公开 |
| `/community/following` | 关注动态 | 需登录 |
| `/community/:postId` | 帖子详情 | 公开 |
| `/user/:id` | 用户主页 | 公开 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/admin` | 管理后台 | 管理员 |

### 5.2 Zustand Stores

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

// stores/wallStore.ts
interface WallState {
  items: WallItem[];
  filters: { scene: string; query: string };
  fetchWall: () => Promise<void>;
  saveCard: (cardId: string) => Promise<void>;
  removeCard: (wallId: string) => Promise<void>;
}
```

### 5.3 核心组件

#### OutfitCard

```typescript
interface OutfitCardProps {
  card: OutfitCard;
  note?: string;
  showActions?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  onClick?: () => void;
}
```

**视觉规格:**
- 卡片宽 320px，圆角 16px，阴影 `shadow-lg`
- 图片区高 240px，圆角 12px，`hover:scale-105 transition`
- 风格标签：胶囊形，`bg-rose-100 text-rose-700`
- 色块：24×24px 圆角方块

#### LinkInput

- 输入框 + 粘贴按钮
- 实时校验（debounce 300ms 调用 `/cards/parse-url`）
- 错误态：红色边框 + 提示文案

#### GenerateProgress

步骤指示器：`解析链接 → 抽取画面 → AI 择优 → 识别穿搭`

---

## 6. 环境变量

### backend/.env

```env
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# 智谱 AI
ZHIPU_API_KEY=xxx

# 可选 Redis
REDIS_URL=redis://localhost:6379

# CORS
FRONTEND_URL=http://localhost:5173
```

### frontend/.env

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 7. 部署规格

### 7.1 开发环境

```bash
# 后端
cd backend && npm install && npm run dev

# 前端
cd frontend && npm install && npm run dev

# 系统依赖
# - FFmpeg: choco install ffmpeg / brew install ffmpeg
# - yt-dlp: pip install yt-dlp
```

### 7.2 生产部署建议

| 组件 | 推荐方案 |
|-----|---------|
| 前端 | Vercel / Netlify |
| 后端 | Railway / Render / 自建 VPS |
| 数据库 | Supabase Cloud |
| 存储 | Supabase Storage |
| FFmpeg/yt-dlp | 后端服务器安装 |

---

## 8. 测试要点

| 模块 | 测试用例 |
|-----|---------|
| 链接解析 | 短链、长链、口令、非法链接 |
| 抽帧 | 正常视频、短视频(<8s)、失败降级 |
| AI 择优 | 高分选中、低分拒绝 |
| AI 识别 | JSON 格式、字段兜底 |
| 灵感墙 | CRUD、置顶排序、筛选搜索 |
| 社区 | 发布、点赞切换、评论限流 |
| Auth | 登录持久化、权限拦截 |

---

## 9. 开发顺序

1. **基础设施:** 项目脚手架、Supabase schema、环境配置
2. **Auth:** Supabase Auth 集成（前后端）
3. **卡片生成链路:** 解析 → 抽帧 → AI → 存储
4. **卡片 UI:** OutfitCard 组件、首页生成流程
5. **灵感墙:** API + 页面 + 筛选
6. **社区:** 广场、点赞、评论
7. **关注 & 管理:** 关注流、举报审核
8. **联调优化:** 错误处理、加载态、移动端适配

---

## 10. 接口错误码规范

| HTTP | Code {
|------|------|
| 400 | INVALID_URL, INVALID_INPUT |
| 401 | UNAUTHORIZED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 422 | OUTFIT_NOT_CLEAR |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_ERROR, PARSE_FAILED, AI_FAILED |

**统一错误响应:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "仅支持抖音视频链接"
  }
}
```
