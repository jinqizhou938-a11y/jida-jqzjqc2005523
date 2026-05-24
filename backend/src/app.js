import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import cardsRoutes from './routes/cards.routes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.FRONTEND_URL || (isProd ? true : 'http://localhost:5173');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/api/v1/cards', cardsRoutes);

if (isProd) {
  const distDir = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 灵感衣橱 API 运行在 http://localhost:${PORT}`);
}).setTimeout(600000);
