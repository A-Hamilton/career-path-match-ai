// Main routes configuration
import { Router } from 'express';
import jobsRouter from './jobs';
import uploadRouter from './upload';
import { AIEnrichmentService } from '../services/ai-enrichment';
import { dbService } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Mount route modules
router.use('/api/jobs', jobsRouter);
router.use('/upload', uploadRouter);

// Salary estimate endpoint
router.get('/api/salary-estimate', async (req, res) => {
  try {
    const { id, title, location } = req.query;
    
    if (!id || !title) {
      return res.status(400).json({ error: 'Missing required parameters: id and title' });
    }

    // Always estimate salary using AI, then upsert in one go
    const mockJob = {
      id: id as string,
      job_title: title as string,
      location: location as string || '',
      description: '',
      short_description: ''
    };

    const salaryData = await (AIEnrichmentService as any).estimateSalary(mockJob);
    
    let range = 'N/A';
    
    if (salaryData && salaryData.min && salaryData.max) {
      range = `${salaryData.min}-${salaryData.max}`;
      
      // Upsert salary info in DB (single call)
      try {
        await dbService.upsertJob({
          id: id as string,
          min_annual_salary_usd: salaryData.min,
          max_annual_salary_usd: salaryData.max
        });      } catch (error) {
        logger.warn('Could not upsert job salary in database:', error);
      }
    }

    return res.json({ range });

  } catch (error) {
    logger.error('Error in salary-estimate endpoint:', error);
    res.status(500).json({ error: 'Failed to estimate salary' });
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
