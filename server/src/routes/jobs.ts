// Job search routes
import { Router, Request, Response } from 'express';
import { jobSearchService } from '../services/job-search';
import { AIEnrichmentService } from '../services/ai-enrichment';
import { logger } from '../utils/logger';
import { MaintenanceService } from '../services/maintenance';

const router = Router();

// GET /api/jobs - Search for jobs (Algolia first, async fallback)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await jobSearchService.getJobs(req.query);
    if (result.status === 202) {
      // No jobs yet, async fetch triggered
      return res.status(202).json(result.metadata);
    }
    // Return jobs from Algolia
    return res.status(200).json({ data: result.data, metadata: result.metadata });
  } catch (error) {
    logger.error('Error in GET /api/jobs:', error);
    res.status(500).json({ 
      error: 'Failed to search jobs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/jobs - Search and enrich jobs with AI (Algolia first, async fallback)
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await jobSearchService.getJobs(req.body);
    if (result.status === 202) {
      // No jobs yet, async fetch triggered
      return res.status(202).json(result.metadata);
    }
    // Enrich jobs with AI if found
    const enrichedJobs = await AIEnrichmentService.enrichJobs(result.data);
    res.status(200).json({
      ...result,
      data: enrichedJobs
    });
  } catch (error) {
    logger.error('Error in POST /api/jobs:', error);
    res.status(500).json({ 
      error: 'Failed to search and enrich jobs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// DELETE /api/jobs/clear-duplicates - Clear duplicate/mock jobs (development only)
router.delete('/clear-duplicates', async (req: Request, res: Response) => {
  try {
    await MaintenanceService.clearMockJobs();
    res.status(200).json({ 
      message: 'Successfully cleared duplicate jobs',
      success: true 
    });
  } catch (error) {
    logger.error('Error clearing duplicate jobs:', error);
    res.status(500).json({ 
      error: 'Failed to clear duplicate jobs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
