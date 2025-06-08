// Resume upload and processing routes
import { Router, Request, Response } from 'express';
import { resumeService } from '../services/resume-processing';
import { verifyToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// POST /upload - Upload and analyze resume
router.post('/', verifyToken, resumeService.getUploadMiddleware(), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  try {
    const result = await resumeService.processResume(req as any);
    res.json(result);
  } catch (error) {
    logger.error('Error processing resume:', error);
    res.status(500).json({ 
      error: 'Failed to process resume', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
