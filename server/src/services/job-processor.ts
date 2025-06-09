// server/src/services/job-processor.ts
import { jobsIndex } from '../config/algolia';
import { dbService } from './database';
import { AIEnrichmentService } from './ai-enrichment';
import { API_ENDPOINTS, appConfig } from '../config/app';
import axios from 'axios';

export class JobProcessorService {
  /**
   * Fetch a job from TheirStack, enrich it, save to Firestore and Algolia.
   * This is called asynchronously when Algolia has no hits for a search.
   * 
   * @param queryParams - The search parameters
   * @param searchKey - Unique key for tracking this search request
   * @returns Promise<boolean> - Whether a job was successfully processed
   */  static async fetchAndProcessJob(queryParams: any, searchKey?: string): Promise<boolean> {
    try {
      // 1. Check if we recently processed similar jobs to avoid duplicates (Smart Deduplication)
      const recentSimilarJobs = await JobProcessorService.checkForRecentSimilarJobs(queryParams);
      if (recentSimilarJobs && recentSimilarJobs.length >= 3) {
        console.log(`Skipping job processing for search ${searchKey || 'unknown'} - found ${recentSimilarJobs.length} recent similar jobs`);
        return true; // Consider this a success since we have recent data
      }
        // 2. Fetch real jobs from TheirStack API
      const theirStackJobs = await JobProcessorService.fetchJobsFromTheirStack(queryParams);
      
      if (!theirStackJobs || theirStackJobs.length === 0) {
        console.log(`No jobs found from TheirStack for search ${searchKey || 'unknown'}`);
        return false;
      }
      
      // Process multiple jobs (2-4 jobs per search) for more realistic results
      const jobsToProcess = theirStackJobs.slice(0, Math.floor(Math.random() * 3) + 2);
      
      let successCount = 0;
      
      for (const rawJob of jobsToProcess) {
        try {
          // 3. Check if this specific job already exists
          const existingJob = await JobProcessorService.checkJobExists(rawJob);
          if (existingJob) {
            console.log(`Skipping duplicate job: ${rawJob.job_title} at ${rawJob.company}`);
            continue;
          }
          
          // 4. Enrich with Gemini AI
          const [enrichedJob] = await AIEnrichmentService.enrichJobs([rawJob]);

          // 5. Save to Firestore
          await dbService.upsertJob(enrichedJob);

          // 4. Save to Algolia, using the unique job ID as the objectID
          const objectToSave = { ...enrichedJob, objectID: enrichedJob.id, createdAt: Date.now() };
          await jobsIndex.saveObjects([objectToSave]);
          
          successCount++;
          console.log(`Successfully indexed job ${enrichedJob.id} for search: ${searchKey || 'unknown'}`);
          
          // Small delay between processing jobs
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (jobError) {
          console.error(`Failed to process individual job:`, jobError);
        }
      }

      // Simulate realistic API processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      console.log(`Processed ${successCount}/${jobsToProcess.length} jobs for search: ${searchKey || 'unknown'}`);
      return successCount > 0;
      
    } catch (error) {
      console.error(`Failed to process jobs for search ${searchKey || 'unknown'}:`, error);
      return false;
    }
  }  /**
   * Fetch real jobs from TheirStack API
   */
  private static async fetchJobsFromTheirStack(queryParams: any): Promise<any[]> {
    try {
      if (!appConfig.theirStackApiKey) {
        console.error('TheirStack API key not configured');
        return [];
      }      // Build TheirStack API filters based on API specification
      const filters: any = {
        posted_at_max_age_days: 30, // Jobs posted within last 30 days
        page: 0,
        limit: 20, // Get more jobs to choose from
        include_total_results: false // For faster responses
      };

      // Add search criteria using correct parameter names from API docs
      if (queryParams.what) {
        // Use job_title_pattern_or for keyword search (case-insensitive patterns)
        const searchTerm = queryParams.what.trim();
        if (searchTerm) {
          filters.job_title_pattern_or = [searchTerm]; // Must be an array
        }      }

      if (queryParams.where) {
        // Use location_name_or for location search
        const locationTerm = queryParams.where.trim();
        if (locationTerm) {
          filters.location_name_or = [locationTerm]; // Must be an array
        }      }

      // Add salary filters if provided (only include supported fields)
      if (queryParams.salary_min) {
        filters.min_annual_salary_usd_gte = parseInt(queryParams.salary_min);
      }
      if (queryParams.salary_max) {
        filters.max_annual_salary_usd_lte = parseInt(queryParams.salary_max);
      }console.log(`Fetching jobs from TheirStack API with filters:`, filters);

      const response = await axios.post(
        API_ENDPOINTS.THEIRSTACK_SEARCH,
        filters,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appConfig.theirStackApiKey}`
          },
          timeout: 15000, // Increased timeout
          validateStatus: (status) => status < 500 // Accept 4xx errors to handle them gracefully
        }
      );

      if (response.status === 402) {
        console.warn('TheirStack API: Payment required or quota exceeded');
        return [];
      }

      if (response.status === 429) {
        console.warn('TheirStack API: Rate limit reached');
        return [];
      }

      if (response.status === 422) {
        console.error('TheirStack API: Invalid parameters:', response.data);
        return [];
      }

      if (response.status !== 200) {
        console.error(`TheirStack API returned status ${response.status}:`, response.data);
        return [];
      }

      const result = response.data;
      const jobsList = Array.isArray(result.data) ? result.data : [];

      console.log(`Retrieved ${jobsList.length} jobs from TheirStack API`);

      // Transform TheirStack jobs to our internal format
      return jobsList.map((job: any) => this.transformTheirStackJob(job));

    } catch (error: any) {
      console.error('Error fetching jobs from TheirStack:', error.response?.data || error.message);
      return [];
    }
  }
  /**
   * Transform TheirStack job data to our internal job format
   */
  private static transformTheirStackJob(theirStackJob: any): any {
    const timestamp = Date.now();
    
    return {
      id: `theirstack_${theirStackJob.id || timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      job_title: theirStackJob.title || theirStackJob.job_title || 'Unknown Position',
      company: theirStackJob.company?.name || theirStackJob.company_name || 'Unknown Company',
      location: theirStackJob.location?.name || theirStackJob.location_name || 'Unknown Location',
      long_location: theirStackJob.location?.full_name || theirStackJob.location_name || 'Unknown Location',
      description: theirStackJob.description || theirStackJob.summary || 'No description available',
      short_description: (theirStackJob.summary || theirStackJob.description || theirStackJob.title || 'Job opportunity').substring(0, 200),
      date_posted: theirStackJob.posted_at || theirStackJob.created_at || new Date().toISOString(),
      remote: theirStackJob.remote || false,
      hybrid: theirStackJob.hybrid || false,
      job_type: theirStackJob.remote ? 'remote' : (theirStackJob.hybrid ? 'hybrid' : 'on-site'),
      min_annual_salary_usd: theirStackJob.min_annual_salary_usd || null,
      max_annual_salary_usd: theirStackJob.max_annual_salary_usd || null,
      country: theirStackJob.location?.country || theirStackJob.country || 'Unknown',
      industry: theirStackJob.company?.industry || theirStackJob.industry || 'Technology',
      tags: this.extractTags(theirStackJob),
      employment_statuses: theirStackJob.employment_type ? [theirStackJob.employment_type] : ['full-time'],
      url: theirStackJob.apply_url || theirStackJob.url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      final_url: theirStackJob.apply_url || theirStackJob.url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      source: 'theirstack'
    };
  }

  /**
   * Extract relevant tags from TheirStack job data
   */
  private static extractTags(job: any): string[] {
    const tags: string[] = [];
    
    // Add skills/technologies if available
    if (job.skills && Array.isArray(job.skills)) {
      tags.push(...job.skills.map((skill: any) => 
        typeof skill === 'string' ? skill.toLowerCase() : skill.name?.toLowerCase()
      ).filter(Boolean));
    }

    // Add job level/seniority
    if (job.seniority_level) {
      tags.push(job.seniority_level.toLowerCase());
    }

    // Add department/function
    if (job.department) {
      tags.push(job.department.toLowerCase());
    }

    // Add remote work type
    if (job.remote) {
      tags.push('remote');
    }
    if (job.hybrid) {
      tags.push('hybrid');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check for recent similar jobs to prevent redundant processing (Smart Deduplication)
   */
  private static async checkForRecentSimilarJobs(queryParams: any): Promise<any[] | null> {
    try {
      const searchTerm = (queryParams.what || '').toLowerCase();
      const location = queryParams.where || '';
      
      // Search for jobs created in the last 4 hours that match the search criteria
      const cutoffTime = Date.now() - (4 * 60 * 60 * 1000); // 4 hours ago
      
      const searchQuery = `${searchTerm} ${location}`.trim();
      
      const result = await jobsIndex.search(searchQuery, {
        filters: `createdAt > ${cutoffTime}`,
        hitsPerPage: 10
      });
      
      if (result.hits && result.hits.length > 0) {
        console.log(`Found ${result.hits.length} recent similar jobs for query: ${searchQuery}`);
        return result.hits;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for recent similar jobs:', error);
      return null;
    }
  }

  /**
   * Check if a specific job already exists to prevent exact duplicates
   */
  private static async checkJobExists(jobData: any): Promise<boolean> {
    try {
      // Search for exact matches by title and company
      const result = await jobsIndex.search('', {
        filters: `job_title:"${jobData.job_title}" AND company:"${jobData.company}"`,
        hitsPerPage: 1
      });
      
      return result.hits && result.hits.length > 0;
    } catch (error) {
      console.error('Error checking if job exists:', error);
      return false;
    }
  }
}
