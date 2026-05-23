import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import cardsRoutes from './routes/cards.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/api/v1/cards', cardsRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 灵感衣橱 API 运行在 http://localhost:${PORT}`);
});
