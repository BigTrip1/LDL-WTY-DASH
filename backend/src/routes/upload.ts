import { Router } from 'express';
import multer from 'multer';
import { ingestCsvBuffer } from '../services/ingest.js';
import { UploadLog } from '../models/Claim.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await ingestCsvBuffer(req.file.buffer, req.file.originalname);
    res.json({ ok: true, filename: req.file.originalname, ...result });
  } catch (err: any) {
    console.error('[upload]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (_req, res) => {
  const rows = await UploadLog.find().sort({ finishedAt: -1 }).limit(20).lean();
  res.json(rows);
});

export default router;
