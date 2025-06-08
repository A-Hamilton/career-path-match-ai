// Main routes configuration
import { Router } from 'express';
import jobsRouter from './jobs';
import uploadRouter from './upload';

const router = Router();

// Mount route modules
router.use('/api/jobs', jobsRouter);
router.use('/upload', uploadRouter);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
