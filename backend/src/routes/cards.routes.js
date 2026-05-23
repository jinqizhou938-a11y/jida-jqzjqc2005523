import { Router } from 'express';
import { parseUrl, generateCard } from '../services/card.service.js';

const router = Router();

router.post('/parse-url', async (req, res) => {
  try {
    const { input } = req.body;
    const result = await parseUrl(input);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { url, user_photo } = req.body;
    const card = await generateCard(url, null, user_photo);
    res.json({
      success: true,
      data: {
        card,
        progress: {
          steps: ['parse', 'extract', 'select', 'recognize', 'tryon'],
          completed: true,
        },
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    });
  }
});

export default router;
