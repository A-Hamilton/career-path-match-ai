// Job search routes
import { Router, Request, Response } from 'express';
import { jobSearchService } from '../services/job-search';
import { AIEnrichmentService } from '../services/ai-enrichment';
import { logger } from '../utils/logger';
import { MaintenanceService } from '../services/maintenance';
import { cacheAnalytics } from '../services/cache-analytics';
import { JobProcessorService } from '../services/job-processor';

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

// GET /api/jobs/cache-analytics - Get cache performance metrics
router.get('/cache-analytics', async (req: Request, res: Response) => {
  try {
    const metrics = cacheAnalytics.getMetrics();
    const efficiencyReport = cacheAnalytics.getEfficiencyReport();
    const hourlyStats = cacheAnalytics.getHourlyStats();
    
    res.status(200).json({
      success: true,
      data: {
        current_metrics: metrics,
        efficiency_report: efficiencyReport,
        hourly_stats: hourlyStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/jobs/cache-analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get cache analytics', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/jobs/reset-cache-analytics - Reset cache analytics (for testing)
router.post('/reset-cache-analytics', async (req: Request, res: Response) => {
  try {
    cacheAnalytics.resetMetrics();
    res.status(200).json({
      success: true,
      message: 'Cache analytics reset successfully'
    });
  } catch (error) {
    logger.error('Error in POST /api/jobs/reset-cache-analytics:', error);
    res.status(500).json({ 
      error: 'Failed to reset cache analytics', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/jobs/warm-cache - Manual cache warming trigger (for testing/admin)
router.post('/warm-cache', async (req: Request, res: Response) => {
  try {
    const { queries } = req.body;
    
    // Use default popular queries if none provided
    const searchQueries = queries || [
      { what: 'Software Engineer', where: 'Remote' },
      { what: 'Product Manager', where: 'Dublin' },
      { what: 'Data Scientist', where: 'Belfast' }
    ];
    
    const results = [];
    
    for (const query of searchQueries.slice(0, 5)) { // Limit to 5 queries for manual warming
      try {
        const startTime = Date.now();
        const success = await JobProcessorService.fetchAndProcessJob(query);
        const duration = Date.now() - startTime;
        
        results.push({
          query,
          success,
          duration,
          timestamp: new Date().toISOString()
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Cache warming completed for ${searchQueries.length} queries`,
      results
    });
    
  } catch (error) {
    logger.error('Error in POST /api/jobs/warm-cache:', error);
    res.status(500).json({ 
      error: 'Failed to warm cache', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
