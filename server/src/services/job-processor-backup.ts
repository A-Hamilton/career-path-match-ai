// server/src/services/job-processor.ts
import { jobsIndex } from '../config/algolia';
import { dbService } from './database';
import { AIEnrichmentService } from './ai-enrichment';
import { AISanitizationService } from './ai-sanitization';
import { API_ENDPOINTS, appConfig } from '../config/app';
import { logger } from '../utils/logger';
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
    try {      // 1. Check if we recently processed similar jobs to avoid duplicates (Smart Deduplication)
      const recentSimilarJobs = await JobProcessorService.checkForRecentSimilarJobs(queryParams);
      if (recentSimilarJobs && recentSimilarJobs.length >= 3) {
        logger.info(`Skipping job processing for search ${searchKey || 'unknown'} - found ${recentSimilarJobs.length} recent similar jobs`);
        return true; // Consider this a success since we have recent data
      }        // 2. Fetch real jobs from TheirStack API
      const theirStackJobs = await JobProcessorService.fetchJobsFromTheirStack(queryParams, searchKey);
      
      if (!theirStackJobs || theirStackJobs.length === 0) {
        logger.info(`No jobs found from TheirStack for search ${searchKey || 'unknown'}`);
        return false;
      }

      // 3. PHASE 1: Process and save ALL jobs to database for data building
      const savedJobs = await JobProcessorService.saveAllJobsToDatabase(theirStackJobs, searchKey);
      
      // 4. PHASE 2: Filter saved jobs for search relevance
      const relevantJobs = JobProcessorService.filterJobsForLocation(savedJobs, queryParams.where);
      
      logger.info(`Saved ${savedJobs.length} jobs to database, ${relevantJobs.length} are relevant for location "${queryParams.where || 'any'}"`);
      
      // If we found relevant jobs for this search, consider it successful
      // If not, we still saved data to the database which is valuable for future searches
      return relevantJobs.length > 0 || savedJobs.length > 0;
      
    } catch (error) {
      logger.error(`Failed to process jobs for search ${searchKey || 'unknown'}:`, error);
      return false;
    }
  }  /**
   * Fetch real jobs from TheirStack API
   */
  private static async fetchJobsFromTheirStack(queryParams: any, searchKey?: string): Promise<any[]> {try {
      if (!appConfig.theirStackApiKey) {
        logger.error('TheirStack API key not configured');
        return [];
      }      // Build TheirStack API filters based on API specification
      const filters: any = {
        posted_at_max_age_days: 30, // Required field - jobs posted within last 30 days
        page: 0,
        limit: 1 // Only get 1 job to conserve API credits and process one at a time
      };

      // Add search criteria using correct parameter names from API docs
      if (queryParams.what) {
        // Use job_title_pattern_or for regex pattern matching (case-insensitive)
        const searchTerm = queryParams.what.trim();
        if (searchTerm) {
          filters.job_title_pattern_or = [searchTerm]; // Must be an array
        }
      }      // NOTE: location_name_or is not supported by TheirStack API
      // Location filtering will be done post-processing
      if (queryParams.where) {
        logger.info(`Location filtering for "${queryParams.where}" will be applied post-processing`);
        
        // Check if this is an unlikely location combination that should be skipped
        if (this.shouldSkipLocationSearch(queryParams.where, queryParams.what)) {
          logger.info(`Skipping TheirStack API call for unlikely location combination: "${queryParams.where}"`);
          return [];
        }
      }

      // Add salary filters if provided (using correct parameter names)
      if (queryParams.salary_min) {
        filters.min_salary_usd = parseInt(queryParams.salary_min);
      }      if (queryParams.salary_max) {
        filters.max_salary_usd = parseInt(queryParams.salary_max);
      }

      logger.info(`Fetching jobs from TheirStack API with filters:`, filters);

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
      );      if (response.status === 402) {
        logger.warn('TheirStack API: Payment required or quota exceeded - consider upgrading plan or implementing fallback');
        // TODO: Could implement fallback to alternative job source here
        return [];
      }

      if (response.status === 429) {
        logger.warn('TheirStack API: Rate limit reached - will retry later');
        return [];
      }

      if (response.status === 422) {
        logger.error('TheirStack API: Invalid parameters:', response.data);
        return [];
      }

      if (response.status !== 200) {
        logger.error(`TheirStack API returned status ${response.status}:`, response.data);
        return [];
      }      const result = response.data;
      let jobsList = Array.isArray(result.data) ? result.data : [];

      logger.info(`Retrieved ${jobsList.length} jobs from TheirStack API`);
      
      // Debug: Log the structure of the first job to understand the data format
      if (jobsList.length > 0) {
        logger.debug('Sample TheirStack job structure:', {
          keys: Object.keys(jobsList[0]),
          sampleData: {
            id: jobsList[0].id,
            title: jobsList[0].title,
            job_title: jobsList[0].job_title,
            company: jobsList[0].company,
            company_name: jobsList[0].company_name,
            location: jobsList[0].location,
            location_name: jobsList[0].location_name,
            long_location: jobsList[0].long_location,
            description: jobsList[0].description?.substring(0, 100) + '...'
          }
        });
      }// Apply location filtering post-processing since TheirStack doesn't support location_name_or
      if (queryParams.where) {
        const locationFilter = queryParams.where.toLowerCase().trim();
        const originalCount = jobsList.length;
        
        // More flexible location matching
        const matchingJobs = jobsList.filter((job: any) => {
          // Handle special cases first
          if (locationFilter === 'remote' && job.remote) {
            return true;
          }
          
          // Get all possible location fields
          const jobLocation = (job.location?.name || job.location_name || job.location || '').toLowerCase();
          const jobLongLocation = (job.location?.full_name || job.long_location || '').toLowerCase();
          const jobCountry = (job.location?.country || job.country || '').toLowerCase();
          const jobCity = (job.location?.city || job.city || '').toLowerCase();
          const jobState = (job.location?.state || job.state || '').toLowerCase();
          
          // Split location filter into parts for flexible matching
          const filterParts: string[] = locationFilter.split(/[\s,]+/).filter((part: string) => part.length > 0);
          
          // Check if any filter part matches any location field
          return filterParts.some(filterPart => 
            jobLocation.includes(filterPart) || 
            jobLongLocation.includes(filterPart) ||
            jobCountry.includes(filterPart) ||
            jobCity.includes(filterPart) ||
            jobState.includes(filterPart) ||
            // Also check for common location abbreviations
            (filterPart === 'ny' && (jobLocation.includes('new york') || jobState.includes('new york'))) ||
            (filterPart === 'nyc' && jobLocation.includes('new york')) ||
            (filterPart === 'sf' && (jobLocation.includes('san francisco') || jobCity.includes('san francisco'))) ||
            (filterPart === 'belfast' && (jobLocation.includes('belfast') || jobCity.includes('belfast')))
          );
        });        // STRATEGY: Save ALL jobs to database for data building, then filter for location relevance
        
        // Step 1: Save ALL jobs to database (regardless of location match)
        logger.info(`Processing all ${originalCount} jobs for database building`);
        const allSanitizedJobs = await AISanitizationService.batchSanitizeJobs(jobsList);
        
        // Save all jobs to database to build our job data
        for (const job of allSanitizedJobs) {
          try {
            // Check if job already exists by URL to avoid duplicates
            const existsByUrl = await JobProcessorService.checkJobExistsByUrl(job.url || '');
            if (existsByUrl) {
              logger.info(`Skipping duplicate job by URL: ${job.url}`);
              continue;
            }

            // Save to Firestore
            await dbService.upsertJob(job);

            // Save to Algolia
            const objectToSave = { ...job, objectID: job.id, createdAt: Date.now() };
            await jobsIndex.saveObjects([objectToSave]);
            
            logger.info(`Successfully indexed job ${job.id} for search: ${searchKey || 'unknown'}`);
            
          } catch (saveError) {
            logger.error(`Failed to save job ${job.id}:`, saveError);
          }
        }
        
        // Step 2: Filter for location-relevant jobs for this specific search
        const locationRelevantJobs = matchingJobs.length > 0 ? matchingJobs : [];
        
        if (locationRelevantJobs.length === 0 && originalCount > 0) {
          logger.info(`No location matches for "${queryParams.where}" found in this batch. Saved ${allSanitizedJobs.length} jobs to database.`);
          // Return empty array - we'll try another batch
          jobsList = [];
        } else {
          logger.info(`Location filter "${queryParams.where}" found ${locationRelevantJobs.length} relevant jobs out of ${originalCount} total`);
          jobsList = locationRelevantJobs;
        }
        
        // Debug: Log some job locations if filtering removed everything
        if (matchingJobs.length === 0 && originalCount > 0) {
          logger.debug('Sample job locations from original results:', {
            originalJobs: Array.isArray(result.data) ? result.data.slice(0, 3).map((job: any, index: number) => ({
              jobIndex: index + 1,
              location: job.location,
              location_name: job.location_name,
              long_location: job.long_location,
              country: job.country,
              city: job.city,
              state: job.state
            })) : [],
            filterTerm: locationFilter,
            strategy: 'saved_to_database_continue_searching'
          });
        }
      }// Transform TheirStack jobs using AI sanitization instead of manual transformation
      const sanitizedJobs = await AISanitizationService.batchSanitizeJobs(jobsList);
      
      return sanitizedJobs;} catch (error: any) {
      logger.error('Error fetching jobs from TheirStack:', error.response?.data || error.message);
      return [];
    }
  }  /**
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
        logger.info(`Found ${result.hits.length} recent similar jobs for query: ${searchQuery}`);
        return result.hits;
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking for recent similar jobs:', error);
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
      logger.error('Error checking if job exists:', error);
      return false;
    }  }

  /**
   * PHASE 1: Save all jobs to database regardless of location match
   * This builds up our job database for better future searches
   */
  private static async saveAllJobsToDatabase(theirStackJobs: any[], searchKey?: string): Promise<any[]> {
    const savedJobs: any[] = [];
    
    for (const rawJob of theirStackJobs) {
      try {
        // Check if this specific job already exists (by URL for better accuracy)
        const jobUrl = rawJob.url || rawJob.final_url || '';
        const existsByUrl = await JobProcessorService.checkJobExistsByUrl(jobUrl);
        
        if (existsByUrl) {
          logger.info(`Skipping duplicate job by URL: ${jobUrl}`);
          continue;
        }

        // Fallback check by title and company
        const existsByTitleCompany = await JobProcessorService.checkJobExists(rawJob);
        if (existsByTitleCompany) {
          logger.info(`Skipping duplicate job: ${rawJob.job_title} at ${rawJob.company}`);
          continue;
        }
        
        // Enrich with Gemini AI
        const [enrichedJob] = await AIEnrichmentService.enrichJobs([rawJob]);

        // Save to Firestore
        await dbService.upsertJob(enrichedJob);

        // Save to Algolia, using the unique job ID as the objectID
        const objectToSave = { ...enrichedJob, objectID: enrichedJob.id, createdAt: Date.now() };
        await jobsIndex.saveObjects([objectToSave]);
          
        savedJobs.push(enrichedJob);
        logger.info(`Successfully saved job ${enrichedJob.id} (${enrichedJob.job_title} at ${enrichedJob.company}) for search: ${searchKey || 'unknown'}`);
        
        // Small delay between processing jobs to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (jobError) {
        logger.error(`Failed to process individual job:`, jobError);
      }
    }

    return savedJobs;
  }

  /**
   * PHASE 2: Filter jobs based on location relevance for search results
   * This determines which saved jobs should appear in search results
   */
  private static filterJobsForLocation(jobs: any[], locationFilter?: string): any[] {
    if (!locationFilter) {
      return jobs; // No location filter, return all jobs
    }

    const normalizedFilter = locationFilter.toLowerCase().trim();
    
    // Handle special cases
    if (normalizedFilter === 'remote') {
      return jobs.filter(job => job.remote === true);
    }

    // Filter jobs that match the location criteria
    const relevantJobs = jobs.filter(job => {
      // Get all possible location fields
      const jobLocation = (job.location || '').toLowerCase();
      const jobLongLocation = (job.long_location || '').toLowerCase();
      const jobCountry = (job.country || '').toLowerCase();
      const jobCity = (job.city || '').toLowerCase();
      const jobState = (job.state || '').toLowerCase();
      
      // Split location filter into parts for flexible matching
      const filterParts = normalizedFilter.split(/[\s,]+/).filter(part => part.length > 0);
      
      // Check if any filter part matches any location field
      return filterParts.some(filterPart => 
        jobLocation.includes(filterPart) || 
        jobLongLocation.includes(filterPart) ||
        jobCountry.includes(filterPart) ||
        jobCity.includes(filterPart) ||
        jobState.includes(filterPart) ||
        // Also check for common location abbreviations
        (filterPart === 'ny' && (jobLocation.includes('new york') || jobState.includes('new york'))) ||
        (filterPart === 'nyc' && jobLocation.includes('new york')) ||
        (filterPart === 'sf' && (jobLocation.includes('san francisco') || jobCity.includes('san francisco'))) ||
        (filterPart === 'belfast' && (jobLocation.includes('belfast') || jobCity.includes('belfast')))
      );
    });

    return relevantJobs;
  }

  /**
   * Check if a job already exists by URL to prevent exact duplicates
   */
  private static async checkJobExistsByUrl(jobUrl: string): Promise<boolean> {
    try {
      if (!jobUrl) return false;
      
      // Search for jobs with the same URL
      const result = await jobsIndex.search('', {
        filters: `url:"${jobUrl}" OR final_url:"${jobUrl}"`,
        hitsPerPage: 1
      });
        return result.hits && result.hits.length > 0;
    } catch (error) {
      logger.error('Error checking if job exists by URL:', error);
      return false;
    }
  }
  /**
   * Determine if a location search is unlikely to yield results and should be skipped
   * This helps save API credits by avoiding searches for locations that TheirStack
   * is unlikely to have jobs for (e.g., small cities outside major markets)
   */
  private static shouldSkipLocationSearch(location: string, jobTitle?: string): boolean {
    if (!location) return false;
    
    const normalizedLocation = location.toLowerCase().trim();
    
    // Never skip remote searches
    if (normalizedLocation === 'remote' || normalizedLocation.includes('remote')) {
      return false;
    }
    
    // For high-demand skills like React, don't skip any location
    // These technologies have global demand and might have jobs anywhere
    const globalDemandSkills = [
      'react', 'javascript', 'node', 'python', 'java', 'typescript', 
      'angular', 'vue', 'aws', 'kubernetes', 'docker', 'full stack',
      'frontend', 'backend', 'software engineer', 'developer'
    ];
    
    if (jobTitle) {
      const normalizedJobTitle = jobTitle.toLowerCase();
      const hasGlobalDemandSkill = globalDemandSkills.some(skill => 
        normalizedJobTitle.includes(skill)
      );
      
      if (hasGlobalDemandSkill) {
        logger.info(`Allowing search for "${location}" because "${jobTitle}" contains globally demanded skills`);
        return false;
      }
    }
      // TheirStack primarily serves global tech markets, but still try major cities
    const majorTechCities = [
      'london', 'dublin', 'edinburgh', 'manchester', 'birmingham', 'glasgow', 'belfast',
      'toronto', 'vancouver', 'montreal', 'ottawa',
      'sydney', 'melbourne', 'brisbane',
      'new york', 'san francisco', 'seattle', 'austin', 'boston', 'chicago',
      'berlin', 'amsterdam', 'paris', 'stockholm', 'copenhagen',
      'singapore', 'hong kong', 'tokyo', 'bangalore', 'mumbai'
    ];
    
    // Always allow major tech cities
    const isMajorTechCity = majorTechCities.some(city => normalizedLocation.includes(city));
    if (isMajorTechCity) {
      return false;
    }
    
    // For smaller cities, only skip if it's very specific patterns that are unlikely
    const veryUnlikelyPatterns = [
      // Very specific small towns with comma separators
      /^[a-z]+,\s*(northern ireland|wales|scotland)$/,
      // Small cities combined with very specific regions
      /^(cork|galway|limerick|waterford),\s*ireland$/,
      /^(dundee|aberdeen|stirling|perth),\s*scotland$/,
      /^(cardiff|swansea|newport),\s*wales$/,
    ];
    
    const isVeryUnlikelyPattern = veryUnlikelyPatterns.some(pattern => 
      pattern.test(normalizedLocation)
    );
    
    if (isVeryUnlikelyPattern) {
      logger.info(`Location "${location}" identified as very specific small city pattern with limited tech job market`);
      return true;
    }
    
    // Allow all other locations including Belfast for tech searches
    return false;
  }
}
