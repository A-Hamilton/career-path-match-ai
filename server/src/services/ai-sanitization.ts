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
      
      // Clean the response multiple times to ensure proper JSON formatting
      let cleanedText = this.cleanJSONResponse(rawText);
        try {
        const sanitizedJob = JSON.parse(cleanedText) as Job;
        
        // Validate the sanitized job conforms to our interface
        this.validateJobData(sanitizedJob);
        
        logger.debug(`Successfully sanitized job: ${sanitizedJob.job_title} at ${sanitizedJob.company}`);
        return sanitizedJob;
        
      } catch (parseError: any) {
        // If first attempt fails, try additional cleaning
        logger.warn(`First JSON parse attempt failed: ${parseError.message}. Trying additional cleaning...`);
        
        // Additional aggressive cleaning
        cleanedText = cleanedText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Remove all control characters
          .replace(/[""]/g, '"') // Normalize quotes
          .replace(/['']/g, "'") // Normalize apostrophes
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/\\n/g, ' ') // Replace escaped newlines
          .replace(/\\r/g, ' ') // Replace escaped carriage returns
          .replace(/\\t/g, ' ') // Replace escaped tabs
          .trim();
        
        try {
          const sanitizedJob = JSON.parse(cleanedText) as Job;
          this.validateJobData(sanitizedJob);
          logger.debug(`Successfully sanitized job after additional cleaning: ${sanitizedJob.job_title} at ${sanitizedJob.company}`);
          return sanitizedJob;
        } catch (secondParseError: any) {
          // Try one more time with manual string replacement for common issues
          logger.warn(`Second JSON parse attempt failed: ${secondParseError.message}. Trying manual fixes...`);
          
          let manuallyFixed = cleanedText;
          
          // Fix common problematic patterns
          manuallyFixed = manuallyFixed
            .replace(/([^\\])\\([^\\"])/g, '$1\\\\$2') // Fix unescaped backslashes
            .replace(/\\"([^"]*?)\\"/g, '"$1"') // Fix over-escaped quotes
            .replace(/:\s*"([^"]*?)[\x00-\x1F]([^"]*?)"/g, ': "$1 $2"') // Fix control chars in values
            .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          
          try {
            const sanitizedJob = JSON.parse(manuallyFixed) as Job;
            this.validateJobData(sanitizedJob);
            logger.debug(`Successfully sanitized job after manual fixes: ${sanitizedJob.job_title} at ${sanitizedJob.company}`);
            return sanitizedJob;
          } catch (finalParseError: any) {
            throw new Error(`JSON parsing failed after all attempts: ${finalParseError.message}`);
          }
        }
      }
      
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
- Return ONLY a single, valid, minified JSON object with NO line breaks inside string values
- No code fences, explanations, or additional text
- All fields must match the exact types specified
- Use null for missing numeric values, not undefined or empty strings
- Boolean fields must be true or false, not strings
- Arrays must be actual arrays, not strings
- NO control characters (\\n, \\r, \\t, etc.) in string values - replace ALL with single spaces
- Escape all quotes and backslashes properly in JSON strings
- Remove all HTML tags and replace with plain text
- Replace any line breaks in descriptions with single spaces
- Ensure company names are extracted from the data structure properly
- Keep all string values on single lines without any breaks
- Clean and normalize all text content to prevent JSON parsing errors

EXAMPLE OUTPUT FORMAT (single line, no breaks):
{"id":"theirstack_123","job_title":"Software Engineer","company":"Tech Corp","location":"New York","long_location":"New York, NY, USA","description":"Great opportunity at tech company","short_description":"Software engineering role","date_posted":"2025-06-09T22:00:00.000Z","min_annual_salary_usd":80000,"max_annual_salary_usd":120000,"country":"United States","industry":"Technology","tags":["javascript","react"],"employment_statuses":["full-time"],"url":"https://example.com","final_url":"https://example.com","remote":false,"source":"theirstack"}

RESPOND WITH VALID JSON ONLY:`;
  }  /**
   * Clean and parse JSON response from AI
   */
  private static cleanJSONResponse(rawText: string): string {
    let cleaned = rawText.trim();
    
    // Remove code fences and comments
    cleaned = cleaned.replace(/```json|```/g, '');
    cleaned = cleaned.replace(/\/\*.*?\*\//gs, '');
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    
    // More aggressive control character removal - remove ALL control chars except space
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
    
    // Remove unicode characters that can cause issues
    cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, ' ');
    
    // Fix common JSON formatting issues
    cleaned = cleaned.replace(/\n/g, ' '); // Replace newlines with spaces
    cleaned = cleaned.replace(/\r/g, ' '); // Replace carriage returns with spaces
    cleaned = cleaned.replace(/\t/g, ' '); // Replace tabs with spaces
    
    // Fix escaped characters that could be problematic
    cleaned = cleaned.replace(/\\\\n/g, ' '); // Remove escaped newlines
    cleaned = cleaned.replace(/\\\\r/g, ' '); // Remove escaped carriage returns
    cleaned = cleaned.replace(/\\\\t/g, ' '); // Remove escaped tabs
    cleaned = cleaned.replace(/\\\\/g, '\\'); // Fix double backslashes
    
    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
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
  }  /**
   * Fallback manual transformation if AI sanitization fails
   * This preserves the existing logic as a safety net
   */
  private static fallbackTransformation(theirStackJob: any, fallbackId?: string): Job {
    const timestamp = Date.now();
    
    logger.warn(`Using fallback transformation for job: ${theirStackJob.title || theirStackJob.job_title || 'Unknown'}`);
      // Debug: Log the raw job structure to understand the data format
    logger.debug('Raw TheirStack job data structure:', {
      keys: Object.keys(theirStackJob),
      company: theirStackJob.company,
      company_name: theirStackJob.company_name,
      location: theirStackJob.location,
      location_name: theirStackJob.location_name,
      long_location: theirStackJob.long_location
    });
    
    // Extract company name from various possible fields with improved logic
    let companyName = 'Unknown Company';
    
    logger.debug('Company extraction - checking fields:', {
      'theirStackJob.company': theirStackJob.company,
      'typeof theirStackJob.company': typeof theirStackJob.company,
      'theirStackJob.company_name': theirStackJob.company_name,
      'theirStackJob.company_object': theirStackJob.company_object
    });
    
    // First check if company field exists and is a string (TheirStack format)
    if (theirStackJob.company && typeof theirStackJob.company === 'string') {
      companyName = theirStackJob.company.trim();
      logger.debug(`Extracted company from 'company' field: ${companyName}`);
    }
    // Check company object structure
    else if (theirStackJob.company?.name) {
      companyName = theirStackJob.company.name.trim();
      logger.debug(`Extracted company from 'company.name' field: ${companyName}`);
    } 
    // Check company_name field
    else if (theirStackJob.company_name) {
      companyName = theirStackJob.company_name.trim();
      logger.debug(`Extracted company from 'company_name' field: ${companyName}`);
    } 
    // Check company_object structure
    else if (theirStackJob.company_object?.name) {
      companyName = theirStackJob.company_object.name.trim();
      logger.debug(`Extracted company from 'company_object.name' field: ${companyName}`);
    } 
    // Check employer fields
    else if (theirStackJob.employer?.name) {
      companyName = theirStackJob.employer.name.trim();
      logger.debug(`Extracted company from 'employer.name' field: ${companyName}`);
    } 
    else if (theirStackJob.employer && typeof theirStackJob.employer === 'string') {
      companyName = theirStackJob.employer.trim();
      logger.debug(`Extracted company from 'employer' field: ${companyName}`);
    } else {
      // Try to extract company from description or URL
      const description = theirStackJob.description || '';
      const url = theirStackJob.url || theirStackJob.apply_url || '';
      
      // Look for company patterns in description
      const companyPatterns = [
        /\*\*([^*]+)\*\*\s*\*\*([^*]+)\*\*/,  // **Company** **Position**
        /at\s+([A-Z][a-zA-Z\s&.-]+)/,         // "at Company Name"
        /^([A-Z][a-zA-Z\s&.-]+)\s*-/          // "Company Name -"
      ];
      
      for (const pattern of companyPatterns) {
        const match = description.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          companyName = match[1].trim();
          break;
        }
      }
        
      // Try to extract from LinkedIn URL
      if (companyName === 'Unknown Company' && url.includes('linkedin.com')) {
        const linkedinMatch = url.match(/at-([^-]+)-/);
        if (linkedinMatch) {
          companyName = linkedinMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
      }
    }        // Extract location from various possible fields with improved logic
    let location = 'Unknown Location';
    let longLocation = 'Unknown Location';
    let country = 'Unknown';
    
    if (theirStackJob.location && typeof theirStackJob.location === 'string') {
      location = theirStackJob.location.trim();
      longLocation = theirStackJob.long_location?.trim() || theirStackJob.location.trim();
      country = theirStackJob.country?.trim() || 'Unknown';
      logger.debug(`Extracted location from 'location' field: ${location}`);
    } else if (theirStackJob.short_location) {
      location = theirStackJob.short_location.trim();
      longLocation = theirStackJob.long_location?.trim() || theirStackJob.short_location.trim();
      country = theirStackJob.country?.trim() || 'Unknown';
      logger.debug(`Extracted location from 'short_location' field: ${location}`);
    } else if (theirStackJob.location?.name) {
      location = theirStackJob.location.name.trim();
      longLocation = theirStackJob.location.full_name?.trim() || theirStackJob.location.name.trim();
      country = theirStackJob.location.country?.trim() || 'Unknown';
      logger.debug(`Extracted location from 'location.name' field: ${location}`);
    } else if (theirStackJob.location_name) {
      location = theirStackJob.location_name.trim();
      longLocation = theirStackJob.long_location?.trim() || theirStackJob.location_name.trim();
      logger.debug(`Extracted location from 'location_name' field: ${location}`);
    } else if (theirStackJob.long_location) {
      location = theirStackJob.long_location.trim();
      longLocation = theirStackJob.long_location.trim();
      logger.debug(`Extracted location from 'long_location' field: ${location}`);
    } else {
      // Try to extract location from description
      const description = theirStackJob.description || '';
      
      // Look for location patterns in description
      const locationPatterns = [
        /\*\*Location\*\*\s*([A-Z][a-zA-Z\s,-]+)/i,  // **Location** LocationName
        /Location[:\s]+([A-Z][a-zA-Z\s,-]+)/i,        // Location: LocationName
        /\*\*([A-Z][a-zA-Z\s,-]+)\*\*[^*]*-[^*]*([A-Z][a-zA-Z\s,-]+)/,  // **Company** - Location
        /([A-Z][a-zA-Z]+),\s*([A-Z][a-zA-Z]+)/       // City, State
      ];
      
      for (const pattern of locationPatterns) {
        const match = description.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          const extractedLocation = match[1].trim();
          if (!extractedLocation.toLowerCase().includes('job') && 
              !extractedLocation.toLowerCase().includes('title') &&
              !extractedLocation.toLowerCase().includes('details')) {
            location = extractedLocation;
            longLocation = extractedLocation;
            break;
          }
        }
      }
    }
      // Try to extract country if not already set
    if (country === 'Unknown' && theirStackJob.country) {
      country = theirStackJob.country;
    }
    
    // Extract industry from company object or description with improved logic
    let industry = 'Technology';
    if (theirStackJob.company_object?.industry) {
      industry = theirStackJob.company_object.industry;
    } else if (theirStackJob.company?.industry) {
      industry = theirStackJob.company.industry;
    } else if (theirStackJob.industry) {
      industry = theirStackJob.industry;
    } else {
      // Try to infer industry from job title, description, and company name
      const jobTitle = (theirStackJob.job_title || theirStackJob.title || '').toLowerCase();
      const description = (theirStackJob.description || '').toLowerCase();
      const company = (companyName || '').toLowerCase();
      
      if (jobTitle.includes('teacher') || jobTitle.includes('education') || description.includes('school') || description.includes('teacher') || company.includes('school')) {
        industry = 'Education';
      } else if (jobTitle.includes('marketing') || jobTitle.includes('sales') || jobTitle.includes('specialist') && description.includes('marketing')) {
        industry = 'Marketing & Sales';
      } else if (jobTitle.includes('healthcare') || jobTitle.includes('medical') || jobTitle.includes('nurse') || company.includes('health')) {
        industry = 'Healthcare';
      } else if (jobTitle.includes('finance') || jobTitle.includes('accounting') || jobTitle.includes('financial')) {
        industry = 'Finance';
      } else if (jobTitle.includes('sap') || jobTitle.includes('basis') || description.includes('sap')) {
        industry = 'Enterprise Software';
      } else if (jobTitle.includes('software') || jobTitle.includes('developer') || jobTitle.includes('engineer')) {
        industry = 'Technology';
      }    }
    
    // Clean up descriptions
    let jobDescription = theirStackJob.description || theirStackJob.summary || 'No description available';
    let jobShortDescription = jobDescription.substring(0, 200);
    
    // Remove HTML tags from description
    jobDescription = jobDescription.replace(/<[^>]*>/g, '');
    jobShortDescription = jobShortDescription.replace(/<[^>]*>/g, '');
    
    return {
      id: fallbackId || `theirstack_${theirStackJob.id || timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      job_title: theirStackJob.job_title || theirStackJob.title || 'Unknown Position',
      company: companyName,
      location: location,
      long_location: longLocation,
      description: jobDescription,
      short_description: jobShortDescription,
      date_posted: theirStackJob.date_posted || theirStackJob.posted_at || theirStackJob.created_at || new Date().toISOString(),
      remote: theirStackJob.remote || false,
      min_annual_salary_usd: theirStackJob.min_annual_salary_usd || null,
      max_annual_salary_usd: theirStackJob.max_annual_salary_usd || null,
      country: country,
      industry: industry,
      tags: this.extractTagsFallback(theirStackJob),
      employment_statuses: theirStackJob.employment_statuses || (theirStackJob.employment_type ? [theirStackJob.employment_type] : ['full-time']),
      url: theirStackJob.url || theirStackJob.apply_url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      final_url: theirStackJob.final_url || theirStackJob.url || theirStackJob.apply_url || `https://theirstack.com/jobs/${theirStackJob.id}`,
      source: 'theirstack'
    };
  }  /**
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

    // Extract tags from job title
    const jobTitle = (job.title || job.job_title || '').toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    const skillTags = [
      'senior', 'junior', 'lead', 'principal', 'staff', 'manager', 'director',
      'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
      'node', 'nodejs', 'frontend', 'backend', 'fullstack', 'full-stack',
      'devops', 'sap', 'basis', 'marketing', 'specialist', 'analyst',
      'teacher', 'biology', 'science', 'education', 'healthcare', 'medical',
      'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'ci/cd', 'agile', 'scrum',
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'
    ];
    
    skillTags.forEach(tag => {
      if (jobTitle.includes(tag) || description.includes(tag)) {
        tags.push(tag);
      }
    });

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
   */  public static async batchSanitizeJobs(rawJobs: any[]): Promise<Job[]> {
    if (!rawJobs.length) {
      logger.info(`No jobs to sanitize - rawJobs array is empty`);
      return [];
    }

    logger.info(`[AI SANITIZATION] Starting batch sanitization of ${rawJobs.length} jobs`);
    
    // Log sample of raw job data for debugging
    logger.debug(`[AI SANITIZATION] Sample raw job data:`, {
      sampleJob: rawJobs[0] ? {
        id: rawJobs[0].id,
        title: rawJobs[0].title || rawJobs[0].job_title,
        company: rawJobs[0].company?.name || rawJobs[0].company_name,
        location: rawJobs[0].location
      } : 'No jobs available'
    });
    
    const sanitizedJobs: Job[] = [];
    
    for (let i = 0; i < rawJobs.length; i++) {
      try {
        const fallbackId = `theirstack_${rawJobs[i].id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`[AI SANITIZATION] Processing job ${i + 1}/${rawJobs.length}: ${rawJobs[i].title || rawJobs[i].job_title || 'Unknown'}`);
        
        const sanitizedJob = await this.sanitizeJobData(rawJobs[i], fallbackId);
        sanitizedJobs.push(sanitizedJob);
        
        logger.info(`[AI SANITIZATION] ✅ Successfully sanitized job ${i + 1}: "${sanitizedJob.job_title}" at ${sanitizedJob.company}`);
        
        // Add delay between jobs except for the last one
        if (i < rawJobs.length - 1) {
          await delay(this.AI_CALL_DELAY_MS);
        }
        
      } catch (error) {
        logger.error(`[AI SANITIZATION] ❌ Failed to sanitize job ${i + 1}:`, error);
        // Continue with other jobs even if one fails
      }
    }
    
    logger.info(`[AI SANITIZATION] Completed batch sanitization: ${sanitizedJobs.length}/${rawJobs.length} jobs processed successfully`);
    return sanitizedJobs;
  }
}
