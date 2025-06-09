// AI-powered job data sanitization service
import { aiService } from '../config/ai';
import { logger } from '../utils/logger';
import { delay } from '../utils/helpers';

export interface Job {
  id: string;
  job_title: string;
  company?: string;
  location?: string;
  long_location?: string;
  description?: string;
  short_description?: string;
  date_posted: string; // Should be in ISO 8601 format
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  country?: string;
  industry?: string;
  tags?: string[];
  employment_statuses?: string[];
  url?: string;
  final_url?: string;
  remote?: boolean;
  source?: string;
}

export class AISanitizationService {
  private static readonly AI_CALL_DELAY_MS = 6000; // 6 seconds between calls for free tier
  private static lastAPICall = 0;

  /**
   * Sanitize raw job data using Gemini AI
   * @param rawJob - Raw job data from external API
   * @param fallbackId - Fallback ID if none exists in raw data
   * @returns Promise<Job> - Sanitized job data conforming to Job interface
   */
  public static async sanitizeJobData(rawJob: any, fallbackId?: string): Promise<Job> {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastCall = now - this.lastAPICall;
      if (timeSinceLastCall < this.AI_CALL_DELAY_MS) {
        const waitTime = this.AI_CALL_DELAY_MS - timeSinceLastCall;
        logger.debug(`Rate limiting: waiting ${waitTime}ms before sanitization API call`);
        await delay(waitTime);
      }

      this.lastAPICall = Date.now();

      const prompt = this.buildSanitizationPrompt(rawJob, fallbackId);
      
      const model = aiService.getGenAIClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const rawText = response.text()?.trim() || '';
      const cleanedText = this.cleanJSONResponse(rawText);
      
      const sanitizedJob = JSON.parse(cleanedText) as Job;
      
      // Validate the sanitized job conforms to our interface
      this.validateJobData(sanitizedJob);
      
      logger.debug(`Successfully sanitized job: ${sanitizedJob.job_title} at ${sanitizedJob.company}`);
      return sanitizedJob;
      
    } catch (error: any) {
      logger.error('Job sanitization failed:', error);
      
      // If AI sanitization fails, fall back to manual transformation as a safety net
      logger.warn(`Falling back to manual transformation for job: ${rawJob.title || rawJob.job_title || 'Unknown'}`);
      return this.fallbackTransformation(rawJob, fallbackId);
    }
  }

  /**
   * Build the sanitization prompt for Gemini AI
   */
  private static buildSanitizationPrompt(rawJob: any, fallbackId?: string): string {
    const rawJobStr = JSON.stringify(rawJob, null, 2);
    
    return `You are an expert data sanitizer and job analyst. Your task is to analyze the following raw job data from an external API and transform it into a clean, standardized format.

INPUT RAW JOB DATA:
${rawJobStr}

INSTRUCTIONS:
1. Analyze the raw job data and extract all relevant information
2. Clean up inconsistencies in formatting, dates, locations, and salary information
3. Standardize location formats (e.g., "Belfast, Northern Ireland, United Kingdom" for long_location, "Belfast" for location)
4. Convert dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
5. Parse and convert salary information to USD annually (research current exchange rates if needed)
6. Extract meaningful tags from job title, description, and requirements
7. Determine if the job is remote based on location data or job description
8. Generate a concise short_description (1-2 sentences, max 200 characters)
9. Clean HTML tags from descriptions but preserve formatting meaning
10. Ensure all data types match the TypeScript interface exactly

REQUIRED OUTPUT INTERFACE:
{
  "id": "string (use existing ID or generate one with fallback: ${fallbackId || 'generated_' + Date.now()})",
  "job_title": "string (cleaned and standardized title)",
  "company": "string (company name)",
  "location": "string (short location like 'Belfast' or 'Remote')",
  "long_location": "string (full location like 'Belfast, Northern Ireland, United Kingdom')",
  "description": "string (cleaned full description without HTML tags)",
  "short_description": "string (1-2 sentence summary, max 200 chars)",
  "date_posted": "string (ISO 8601 format)",
  "min_annual_salary_usd": number or null,
  "max_annual_salary_usd": number or null,
  "country": "string (full country name)",
  "industry": "string (industry category)",
  "tags": ["array", "of", "relevant", "skill", "tags"],
  "employment_statuses": ["array of employment types like 'full-time', 'part-time', 'contract'"],
  "url": "string (job application URL)",
  "final_url": "string (same as url unless redirected)",
  "remote": boolean,
  "source": "theirstack"
}

CRITICAL REQUIREMENTS:
- Return ONLY a single, valid, minified JSON object
- No code fences, explanations, or additional text
- All fields must match the exact types specified
- Use null for missing numeric values, not undefined or empty strings
- Boolean fields must be true or false, not strings
- Arrays must be actual arrays, not strings

RESPOND WITH VALID JSON ONLY:`;
  }

  /**
   * Clean and parse JSON response from AI
   */
  private static cleanJSONResponse(rawText: string): string {
    let cleaned = rawText.trim();
    
    // Remove code fences and comments
    cleaned = cleaned.replace(/```json|```/g, '');
    cleaned = cleaned.replace(/\/\*.*?\*\//gs, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    // Remove trailing commas
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    
    // Extract JSON object if extra text is present
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return match[0];
    }
    
    return cleaned;
  }

  /**
   * Validate that sanitized job data conforms to Job interface
   */
  private static validateJobData(job: any): void {
    const requiredFields = ['id', 'job_title'];
    const stringFields = ['id', 'job_title', 'company', 'location', 'long_location', 'description', 'short_description', 'date_posted', 'country', 'industry', 'url', 'final_url', 'source'];
    const numberFields = ['min_annual_salary_usd', 'max_annual_salary_usd'];
    const booleanFields = ['remote'];
    const arrayFields = ['tags', 'employment_statuses'];

    // Check required fields
    for (const field of requiredFields) {
      if (!job[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate string fields
    for (const field of stringFields) {
      if (job[field] !== undefined && job[field] !== null && typeof job[field] !== 'string') {
        throw new Error(`Field ${field} must be a string, got ${typeof job[field]}`);
      }
    }

    // Validate number fields
    for (const field of numberFields) {
      if (job[field] !== undefined && job[field] !== null && typeof job[field] !== 'number') {
        throw new Error(`Field ${field} must be a number or null, got ${typeof job[field]}`);
      }
    }

    // Validate boolean fields
    for (const field of booleanFields) {
      if (job[field] !== undefined && typeof job[field] !== 'boolean') {
        throw new Error(`Field ${field} must be a boolean, got ${typeof job[field]}`);
      }
    }

    // Validate array fields
    for (const field of arrayFields) {
      if (job[field] !== undefined && !Array.isArray(job[field])) {
        throw new Error(`Field ${field} must be an array, got ${typeof job[field]}`);
      }
    }

    // Validate date format
    if (job.date_posted) {
      const date = new Date(job.date_posted);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for date_posted: ${job.date_posted}`);
      }
    }

    logger.debug(`Job data validation passed for: ${job.id}`);
  }

  /**
   * Fallback manual transformation if AI sanitization fails
   * This preserves the existing logic as a safety net
   */
  private static fallbackTransformation(theirStackJob: any, fallbackId?: string): Job {
    const timestamp = Date.now();
    
    logger.warn(`Using fallback transformation for job: ${theirStackJob.title || theirStackJob.job_title || 'Unknown'}`);
    
    return {
      id: fallbackId || `theirstack_${theirStackJob.id || timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      job_title: theirStackJob.title || theirStackJob.job_title || 'Unknown Position',
      company: theirStackJob.company?.name || theirStackJob.company_name || 'Unknown Company',
      location: theirStackJob.location?.name || theirStackJob.location_name || 'Unknown Location',
      long_location: theirStackJob.location?.full_name || theirStackJob.location_name || 'Unknown Location',
      description: theirStackJob.description || theirStackJob.summary || 'No description available',
      short_description: (theirStackJob.summary || theirStackJob.description || theirStackJob.title || 'Job opportunity').substring(0, 200),
      date_posted: theirStackJob.posted_at || theirStackJob.created_at || new Date().toISOString(),
      remote: theirStackJob.remote || false,
      min_annual_salary_usd: theirStackJob.min_annual_salary_usd || null,
      max_annual_salary_usd: theirStackJob.max_annual_salary_usd || null,
      country: theirStackJob.location?.country || theirStackJob.country || 'Unknown',
      industry: theirStackJob.company?.industry || theirStackJob.industry || 'Technology',
      tags: this.extractTagsFallback(theirStackJob),
      employment_statuses: theirStackJob.employment_type ? [theirStackJob.employment_type] : ['full-time'],
      url: theirStackJob.apply_url || theirStackJob.url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      final_url: theirStackJob.apply_url || theirStackJob.url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      source: 'theirstack'
    };
  }

  /**
   * Extract tags fallback method
   */
  private static extractTagsFallback(job: any): string[] {
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
   * Batch sanitize multiple jobs with rate limiting
   */
  public static async batchSanitizeJobs(rawJobs: any[]): Promise<Job[]> {
    if (!rawJobs.length) return [];

    logger.info(`Starting batch sanitization of ${rawJobs.length} jobs`);
    
    const sanitizedJobs: Job[] = [];
    
    for (let i = 0; i < rawJobs.length; i++) {
      try {
        const fallbackId = `theirstack_${rawJobs[i].id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sanitizedJob = await this.sanitizeJobData(rawJobs[i], fallbackId);
        sanitizedJobs.push(sanitizedJob);
        
        logger.debug(`Sanitized job ${i + 1}/${rawJobs.length}: ${sanitizedJob.job_title}`);
        
        // Add delay between jobs except for the last one
        if (i < rawJobs.length - 1) {
          await delay(this.AI_CALL_DELAY_MS);
        }
        
      } catch (error) {
        logger.error(`Failed to sanitize job ${i + 1}:`, error);
        // Continue with other jobs even if one fails
      }
    }
    
    logger.info(`Completed batch sanitization: ${sanitizedJobs.length}/${rawJobs.length} jobs processed successfully`);
    return sanitizedJobs;
  }
}
