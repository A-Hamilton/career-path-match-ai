// Main routes configuration
import { Router } from 'express';
import jobsRouter from './jobs';
import uploadRouter from './upload';
import { AIEnrichmentService } from '../services/ai-enrichment';
import { dbService } from '../services/database';

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

    // Check if we already have salary data for this job
    try {
      const existingJob = await dbService.getJobById(id as string);
      if (existingJob && (existingJob.min_annual_salary_usd || existingJob.max_annual_salary_usd)) {
        const range = `${existingJob.min_annual_salary_usd || 'N/A'}-${existingJob.max_annual_salary_usd || 'N/A'}`;
        return res.json({ range });
      }
    } catch (error) {
      console.warn('Could not fetch existing job data:', error);
    }

    // Estimate salary using AI
    const mockJob = {
      id: id as string,
      job_title: title as string,
      location: location as string || '',
      description: '',
      short_description: ''
    };

    const salaryData = await (AIEnrichmentService as any).estimateSalary(mockJob);
    
    if (salaryData && salaryData.min && salaryData.max) {
      const range = `${salaryData.min}-${salaryData.max}`;
      
      // Try to update the job in database with salary info
      try {
        await dbService.updateJobSalary(id as string, salaryData.min, salaryData.max);
      } catch (error) {
        console.warn('Could not update job salary in database:', error);
      }
      
      return res.json({ range });
    }

    // Fallback response
    res.json({ range: 'N/A' });

  } catch (error) {
    console.error('Salary estimation error:', error);
    res.json({ range: 'N/A' });
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
