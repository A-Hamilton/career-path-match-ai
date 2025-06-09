// AI enrichment service
import { aiService } from '../config/ai';
import { enrichmentCache } from './cache';
import { logger } from '../utils/logger';
import { delay } from '../utils/helpers';

export interface JobEnrichmentData {
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  country?: string;
  industry?: string;
  tags?: string[];
}

export interface Job {
  id: string;
  job_title: string;
  description?: string;
  short_description?: string;
  location?: string;
  long_location?: string;
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  country?: string;
  industry?: string;
  tags?: string[];
  [key: string]: any;
}

export class AIEnrichmentService {
  private static readonly AI_CALL_DELAY_MS = 6000; // 6 seconds between calls for free tier
  private static readonly MAX_AI_ENRICHMENTS_PER_REQUEST = 2; // Reduced from 3 to 2
  private static lastAPICall = 0;
  private static requestQueue: (() => Promise<void>)[] = [];
  private static isProcessingQueue = false;
  
  public static needsEnrichment(job: Job): boolean {
    return (!job.min_annual_salary_usd && !job.max_annual_salary_usd) ||
           !job.country || !job.industry || !job.tags;
  }
  
  public static async enrichJobs(jobs: Job[]): Promise<Job[]> {
    if (!jobs.length) return jobs;
    
    const jobsNeedingEnrichment = jobs.filter(job => {
      const cacheKey = `enrichment:${job.id}`;
      const cached = enrichmentCache.get(cacheKey);
      
      if (cached) {
        // Apply cached enrichment data
        Object.assign(job, cached);
        return false;
      }
      
      return this.needsEnrichment(job);
    });
    
    if (!jobsNeedingEnrichment.length) return jobs;
    
    logger.info(`Enriching ${jobsNeedingEnrichment.length} jobs with AI data`);
    
    // Process in batches to respect rate limits
    const batchSize = this.MAX_AI_ENRICHMENTS_PER_REQUEST;
    const batches = [];
    for (let i = 0; i < jobsNeedingEnrichment.length; i += batchSize) {
      batches.push(jobsNeedingEnrichment.slice(i, i + batchSize));
    }
    
    // Process first batch only to prevent overwhelming the API
    const batchToProcess = batches[0] || [];
    
    for (let i = 0; i < batchToProcess.length; i++) {
      const job = batchToProcess[i];
      const enrichmentData: JobEnrichmentData = {};
      
      try {
        // Salary estimation
        if (!job.min_annual_salary_usd && !job.max_annual_salary_usd) {
          const salaryData = await this.estimateSalary(job);
          if (salaryData) {
            job.min_annual_salary_usd = salaryData.min;
            job.max_annual_salary_usd = salaryData.max;
            enrichmentData.min_annual_salary_usd = salaryData.min;
            enrichmentData.max_annual_salary_usd = salaryData.max;
          }
        }
        
        // Fields enrichment (country, industry, tags)
        if (!job.country || !job.industry || !job.tags) {
          const fieldsData = await this.enrichFields(job);
          if (fieldsData) {
            if (fieldsData.country) {
              job.country = fieldsData.country;
              enrichmentData.country = fieldsData.country;
            }
            if (fieldsData.industry) {
              job.industry = fieldsData.industry;
              enrichmentData.industry = fieldsData.industry;
            }
            if (fieldsData.tags) {
              job.tags = fieldsData.tags;
              enrichmentData.tags = fieldsData.tags;
            }
          }
        }
        
        // Cache the enrichment data
        if (Object.keys(enrichmentData).length > 0) {
          const cacheKey = `enrichment:${job.id}`;
          enrichmentCache.set(cacheKey, enrichmentData);
        }
        
        // Add delay between AI calls
        if (i < batchToProcess.length - 1) {
          await delay(this.AI_CALL_DELAY_MS);
        }
        
      } catch (error) {
        logger.warn(`AI enrichment failed for job ${job.id}:`, error);
      }
    }
    
    return jobs;
  }    private static async estimateSalary(job: Job): Promise<{ min: number; max: number } | null> {
    try {
      const prompt = `Estimate the annual salary range in USD for a '${job.job_title}' role${job.location ? ` in ${job.location}` : ''}. Respond ONLY with a valid JSON object in this exact format: {"min": 50000, "max": 75000}. Do not include any other text, code fences, or explanations.`;
      
      const model = aiService.getGenAIClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const rawText = response.text()?.trim() || '';
      const cleanedText = this.cleanJSONResponse(rawText);
      
      const salaryData = JSON.parse(cleanedText);
      return {
        min: salaryData.min || 0,
        max: salaryData.max || 0
      };
    } catch (error) {
      logger.warn(`Salary estimation failed for job ${job.id}:`, error);
      return null;
    }
  }    private static async enrichFields(job: Job): Promise<JobEnrichmentData | null> {
    try {
      const prompt = `Based on the job title "${job.job_title}" and description "${job.description || job.short_description || ''}", extract the country, industry, and 5 relevant tags. Respond ONLY with a valid JSON object in this exact format: {"country": "string", "industry": "string", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}. Do not include any other text, code fences, or explanations.`;
      
      const model = aiService.getGenAIClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const rawText = response.text()?.trim() || '';
      const cleanedText = this.cleanJSONResponse(rawText);
      
      return JSON.parse(cleanedText);
    } catch (error) {
      logger.warn(`Fields enrichment failed for job ${job.id}:`, error);
      return null;
    }
  }
  
  private static cleanJSONResponse(rawText: string): string {
    // Remove markdown code fences
    let jsonText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/,'').trim();
    
    // Find JSON object boundaries
    const startIdx = jsonText.indexOf('{');
    const endIdx = jsonText.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonText = jsonText.substring(startIdx, endIdx + 1);
    }
    
    return jsonText;
  }
  
  /**
   * Rate-limited API call wrapper
   */
  private static async makeRateLimitedAPICall<T>(apiCall: () => Promise<T>): Promise<T | null> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastCall = now - this.lastAPICall;
          
          if (timeSinceLastCall < this.AI_CALL_DELAY_MS) {
            const waitTime = this.AI_CALL_DELAY_MS - timeSinceLastCall;
            console.log(`Rate limiting: waiting ${waitTime}ms before API call`);
            await delay(waitTime);
          }
          
          this.lastAPICall = Date.now();
          const result = await apiCall();
          resolve(result);
        } catch (error: any) {
          if (error.status === 429) {
            console.warn('API rate limit hit, returning null');
            resolve(null);
          } else {
            throw error;
          }
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue sequentially
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
      }
    }
    
    this.isProcessingQueue = false;
  }
}
