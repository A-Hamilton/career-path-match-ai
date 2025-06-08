// Job search routes
import { Router, Request, Response } from 'express';
import { jobSearchService } from '../services/job-search';
import { AIEnrichmentService } from '../services/ai-enrichment';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/jobs - Search for jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      location = '',
      sortBy = 'relevance',
      limit = '10',
      offset = '0',
      country = ''
    } = req.query;

    const searchParams = {
      search: search as string,
      location: location as string,
      sortBy: sortBy as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),      country: country as string
    };

    const result = await jobSearchService.searchJobs(searchParams);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /api/jobs:', error);
    res.status(500).json({ 
      error: 'Failed to search jobs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/jobs - Search and enrich jobs with AI
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      location = '',
      sortBy = 'relevance',
      limit = 3,
      offset = 0,
      country = ''
    } = req.body;

    const searchParams = {
      search: search as string,
      location: location as string,
      sortBy: sortBy as string,
      limit: Math.min(limit, 10), // Cap at 10
      offset: offset as number,
      country: country as string
    };    // Search for jobs
    const searchResult = await jobSearchService.searchJobs(searchParams);
    
    if (!searchResult.data || searchResult.data.length === 0) {
      return res.json(searchResult);
    }

    // Enrich jobs with AI
    const enrichedJobs = await AIEnrichmentService.enrichJobs(searchResult.data);
    
    res.json({
      ...searchResult,
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

export default router;
