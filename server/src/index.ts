import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import admin from 'firebase-admin';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import cron from 'node-cron';
import fs from 'fs/promises'; // Import the 'fs/promises' module
import pdf from 'pdf-parse';

// Load environment variables from the server directory
const envPath = path.join(__dirname, '..', '.env');
config({ path: envPath });

// Initialize Firebase Admin SDK
admin.initializeApp({ credential: admin.credential.applicationDefault() });
// Capture FieldValue static before any mocking
const FieldValue = admin.firestore.FieldValue;

// NOTE: use admin.firestore() dynamically so tests mocking admin.firestore() work correctly

// Initialize Google GenAI client
const genClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rate limiting helper for AI calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const AI_CALL_DELAY_MS = 4500; // 4.5 seconds between calls (13 calls/minute max)
const MAX_AI_ENRICHMENTS_PER_REQUEST = 3;

// Schedule daily cleanup only when run directly (avoid during tests)
if (require.main === module) {
  cron.schedule('0 0 * * *', async () => {
    try {
      const cutoffDateISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const snapshot = await admin.firestore().collection('jobs')
        .where('date_posted', '<', cutoffDateISO)
        .get();
      if (!snapshot.empty) {
        const batch = admin.firestore().batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleanup job: deleted ${snapshot.size} old jobs.`);
      } else {
        console.log('Cleanup job: no old jobs to delete.');
      }
    } catch (error) {
      console.error('Error running cleanup job:', error);
    }
  });
}

export const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware: verify Firebase ID token
async function verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    console.log("Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("No valid Authorization Header found.");
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log("Extracted ID Token:", idToken);

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        (req as any).user = decoded;
        console.log("Token Verified Successfully:", decoded);
        next();
    } catch (err: any) {
        console.error("Token Verification Failed:", err);
        console.error("Error Code:", err.code); // Log the error code
        console.error("Error Message:", err.message); // Log the error message
        return res.status(401).json({ error: 'Unauthorized', message: err.message, code: err.code });
    }
}

// Configure Multer for file uploads
const upload = multer({ dest: './uploads' });

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Use Google Gemini via GenAI SDK
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY in .env');
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Resume upload endpoint
// Protect upload with auth
app.post('/upload', verifyToken, upload.single('resume'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = path.join(__dirname, '..', req.file.path);

  try {
    let fileContent;

    // Check if the uploaded file is a PDF
    if (req.file.mimetype === 'application/pdf') {
      const fileBuffer = await fs.readFile(filePath);
      try {
        const pdfData = await pdf(fileBuffer);
        fileContent = pdfData.text;      } catch (pdfError) {
        const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF parsing error';
        console.error('PDF Parsing Error:', errorMessage);
        return res.status(400).json({
          error: 'Failed to parse PDF file',
          details: errorMessage,
        });
      }
    } else {
      // For non-PDF files, read as text
      fileContent = await fs.readFile(filePath, 'utf-8');
    }

    // Updated prompt to extract structured data
    const prompt = `
      Analyze the following resume and extract the following structured data:
      1. **Work Experience**: Include job titles, companies, dates, and descriptions of responsibilities and achievements.
      2. **Skills**: List all technical and soft skills mentioned in the resume.
      3. **Education**: Include institutions, degrees, fields of study, and dates.
      4. **Projects**: Include project names, descriptions, technologies used, and links if available.
      5. **Certifications or Awards**: Include any certifications, awards, or recognitions mentioned.
      6. **Professional Summary**: Provide a concise summary of the candidate's professional profile.
      7. **Strengths**: Highlight key strengths based on the resume content.
      8. **Areas for Improvement**: Suggest areas where the resume could be improved.
      9. **Keyword Optimization**: Identify keywords found in the resume and suggest missing keywords relevant to the target job title.

      Resume Content:
      ${fileContent}

      Respond with a JSON object containing the extracted data in the following format:
      {
        "workExperience": [...],
        "skills": [...],
        "education": [...],
        "projects": [...],
        "certifications": [...],
        "summary": "...",
        "strengths": [...],
        "improvements": [...],
        "keywords": {
          "found": [...],
          "missing": [...]
        }
      }
    `;

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const rawAnalysis = geminiResponse.text?.trim() || 'No analysis available.';

    // Remove backticks if present
    const cleanedAnalysis = rawAnalysis.replace(/```json|```/g, '').trim();

    // Validate and parse the response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanedAnalysis);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleanedAnalysis);
      return res.status(500).json({
        error: 'Failed to parse Gemini response',
        details: 'The response from Gemini AI is not valid JSON.',
        rawResponse: cleanedAnalysis,
      });
    }

    // Calculate a score based on the presence of key fields
    const score = calculateScore(parsedAnalysis);

    // Validate the structure of the parsed response
    if (
      !parsedAnalysis.workExperience ||
      !parsedAnalysis.skills ||
      !parsedAnalysis.education ||
      !parsedAnalysis.projects ||
      !parsedAnalysis.certifications ||
      !parsedAnalysis.summary ||
      !parsedAnalysis.strengths ||
      !parsedAnalysis.improvements ||
      !parsedAnalysis.keywords
    ) {
      console.error('Invalid response structure:', parsedAnalysis);
      return res.status(500).json({
        error: 'Invalid response structure',
        details: 'The response from Gemini AI is missing required fields.',
        parsedResponse: parsedAnalysis,
      });
    }

    res.json({ ...parsedAnalysis, score });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume', details: error.message });
  } finally {
    // Ensure the uploaded file is deleted
    await fs.unlink(filePath).catch((err) => console.error('Failed to delete file:', err));
  }
});

// Helper function to calculate a score
function calculateScore(data: any): number {
  let score = 0;

  // Add points for each section present
  if (data.workExperience?.length) score += 30;
  if (data.skills?.length) score += 20;
  if (data.education?.length) score += 15;
  if (data.projects?.length) score += 15;
  if (data.certifications?.length) score += 10;
  if (data.strengths?.length) score += 5;
  if (data.improvements?.length) score += 5;

  // Cap the score at 100
  return Math.min(score, 100);
}

// TheirStack API key from .env
const THEIRSTACK_API_KEY = process.env.THEIRSTACK_API_KEY;

// Simple in-memory cache for job search results with better structure
const jobCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cache for enriched jobs to avoid re-enriching
const enrichmentCache = new Map<string, { data: any; expires: number }>();
const ENRICHMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Query results cache for better performance
const queryCache = new Map<string, { data: any; expires: number; totalCount: number }>();
const QUERY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Cache cleanup interval (every hour)
setInterval(() => {
  const now = Date.now();
  
  // Cleanup job cache
  for (const [key, value] of jobCache.entries()) {
    if (value.expires < now) {
      jobCache.delete(key);
    }
  }
  
  // Cleanup enrichment cache
  for (const [key, value] of enrichmentCache.entries()) {
    if (value.expires < now) {
      enrichmentCache.delete(key);
    }
  }
  
  // Cleanup query cache
  for (const [key, value] of queryCache.entries()) {
    if (value.expires < now) {
      queryCache.delete(key);
    }
  }
  
  console.log(`Cache cleanup: jobCache=${jobCache.size}, enrichmentCache=${enrichmentCache.size}, queryCache=${queryCache.size}`);
}, 60 * 60 * 1000);

// Helper to create a cache key from the request body
function getCacheKey(body: any) {
    return JSON.stringify(body);
}

// Helper to check if job needs enrichment
function needsEnrichment(job: any): boolean {
  return (!job.min_annual_salary_usd && !job.max_annual_salary_usd) ||
         !job.country || !job.industry || !job.tags;
}

// Optimized Firestore query builder
function buildOptimizedQuery(collection: any, filters: any) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let query = collection.where('date_posted', '>=', cutoff);
  
  // Apply filters that have database indexes
  if (filters.salary_min && !filters.salary_max) {
    query = query.where('min_annual_salary_usd', '>=', Number(filters.salary_min));
  }
  if (filters.salary_max && !filters.salary_min) {
    query = query.where('max_annual_salary_usd', '<=', Number(filters.salary_max));
  }
  
  // Order by date for consistent pagination
  query = query.orderBy('date_posted', 'desc');
  
  return query;
}

// Throttled Firestore reader to prevent overwhelming the database
let lastFirestoreRead = 0;
const FIRESTORE_READ_THROTTLE_MS = 1000; // 1 second between reads

async function throttledFirestoreRead(query: any): Promise<any[]> {
  const now = Date.now();
  const timeSinceLastRead = now - lastFirestoreRead;
  
  if (timeSinceLastRead < FIRESTORE_READ_THROTTLE_MS) {
    await delay(FIRESTORE_READ_THROTTLE_MS - timeSinceLastRead);
  }
  
  try {
    const snap = await query.get();
    lastFirestoreRead = Date.now();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Throttled Firestore read error:', error);
    throw error;
  }
}

// Proxy TheirStack job search (avoid CORS, with caching) - OPTIMIZED
app.post('/api/jobs', async (req, res) => {
  try {
    if (!THEIRSTACK_API_KEY) {
      return res.status(500).json({ error: 'TheirStack API key not configured' });
    }
    
    // Accept filters from frontend (body) with optimized defaults
    const filters = req.body && Object.keys(req.body).length ? req.body : { posted_at_max_age_days: 30, page: 0, limit: 3 };
    
    // Set reasonable limits for rate limiting
    filters.page = Math.max(0, filters.page || 0);
    filters.limit = Math.min(10, Math.max(1, filters.limit || 3)); // Cap at 10, default 3
    
    // Ensure at least one required filter
    if (!filters.posted_at_max_age_days && !filters.posted_at_gte && !filters.posted_at_lte && !filters.company_name_or) {
      return res.status(400).json({ error: 'At least one required filter (posted_at_max_age_days, posted_at_gte, posted_at_lte, company_name_or) must be provided.' });
    }
    
    const cacheKey = getCacheKey(filters);
    const now = Date.now();
    
    // Check cache first
    if (jobCache.has(cacheKey)) {
      const cached = jobCache.get(cacheKey)!;
      if (cached.expires > now) {
        return res.json(cached.data);
      } else {
        jobCache.delete(cacheKey);
      }
    }
    
    // Check if we have existing jobs in Firestore that match the criteria
    let existingJobs: any[] = [];
    try {
      const cutoff = new Date(Date.now() - (filters.posted_at_max_age_days || 30) * 24 * 60 * 60 * 1000).toISOString();
      let query = admin.firestore().collection('jobs')
        .where('date_posted', '>=', cutoff)
        .orderBy('date_posted', 'desc')
        .limit(filters.limit + 5); // Get a few extra
        
      existingJobs = await throttledFirestoreRead(query);
      
      // If we have enough existing jobs, return them with enrichment
      if (existingJobs.length >= filters.limit) {
        const enrichedJobs = await enrichJobsWithAI(existingJobs.slice(0, filters.limit));
        const responseData = {
          data: enrichedJobs,
          metadata: {
            total_results: existingJobs.length,
            page: filters.page || 0,
            limit: filters.limit,
            has_more: existingJobs.length > filters.limit
          }
        };
        
        // Cache this result for a shorter time since it's from existing data
        jobCache.set(cacheKey, { 
          data: responseData, 
          expires: now + (CACHE_TTL_MS / 4) // 15 minute cache for existing data
        });
        
        return res.json(responseData);
      }
    } catch (dbError) {
      console.warn('Firestore query failed, falling back to API:', dbError);
    }
    
    // Not enough cached data, fetch from TheirStack API
    try {
      const response = await axios.post(
        'https://api.theirstack.com/v1/jobs/search',
        filters,
        { 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${THEIRSTACK_API_KEY}` },
          timeout: 10000,
          validateStatus: () => true
        }
      );
      
      if (response.status === 402) {
        console.warn('TheirStack rate limit reached in POST');
        return res.status(429).json({ 
          error: 'Rate limit reached. Please try again later.',
          data: [],
          metadata: { total_results: 0 }
        });
      }
      
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }
        const result = response.data;
      const jobsList = Array.isArray(result.data) ? result.data : [];
      
      // Deduplicate against existing jobs to avoid duplicates
      const existingJobIds = new Set(existingJobs.map((job: any) => String(job.id)));
      const newJobs = jobsList.filter((job: any) => !existingJobIds.has(String(job.id)));
      
      if (newJobs.length > 0) {
        // Enrich new jobs with AI data
        const enrichedNewJobs = await enrichJobsWithAI(newJobs.slice(0, MAX_AI_ENRICHMENTS_PER_REQUEST));
        
        // Batch persist new jobs to Firestore
        try {
          const batch = admin.firestore().batch();
          let batchCount = 0;
          
          enrichedNewJobs.forEach((job: any) => {
            if (batchCount < 500) { // Firestore batch limit
              const docRef = admin.firestore().collection('jobs').doc(String(job.id));
              batch.set(docRef, {
                ...job,
                date_posted: job.date_posted || job.created,
                cachedAt: FieldValue.serverTimestamp()
              }, { merge: true });
              batchCount++;
            }
          });
          
          if (batchCount > 0) {
            await batch.commit();
            console.log(`POST: Persisted ${batchCount} new jobs to Firestore`);
          }
        } catch (persistError) {
          console.error('Error persisting new jobs to Firestore:', persistError);
        }
        
        // Combine existing and new jobs for the response
        const allJobs = [...existingJobs, ...enrichedNewJobs].slice(0, filters.limit);
        result.data = allJobs;
        result.metadata = result.metadata || {};
        result.metadata.from_cache = existingJobs.length;
        result.metadata.from_api = enrichedNewJobs.length;
      }
      
      // Cache the result
      jobCache.set(cacheKey, { data: result, expires: now + CACHE_TTL_MS });
      
      return res.json(result);
      
    } catch (apiError: any) {
      console.error('TheirStack API error in POST:', apiError.response?.data || apiError.message);
      
      // If API fails but we have some existing jobs, return those
      if (existingJobs.length > 0) {
        const enrichedJobs = await enrichJobsWithAI(existingJobs.slice(0, filters.limit));
        return res.json({
          data: enrichedJobs,
          metadata: {
            total_results: existingJobs.length,
            page: filters.page || 0,
            limit: filters.limit,
            has_more: false,
            fallback: true
          }
        });
      }
      
      // Complete failure
      return res.status(500).json({
        error: 'Failed to fetch jobs',
        details: apiError.response?.data || apiError.message,
        data: [],
        metadata: { total_results: 0 }
      });
    }
      } catch (err: any) {
    console.error('POST /api/jobs error:', err);
    return res.status(500).json({
      error: 'Failed to process job search request',
      details: err.message,
      data: [],
      metadata: { total_results: 0 }
    });
  }
});

// Helper function to enrich jobs with AI data (optimized)
async function enrichJobsWithAI(jobs: any[]): Promise<any[]> {
  if (!jobs.length) return jobs;
  
  // Check enrichment cache first
  const now = Date.now();
  const jobsNeedingEnrichment = jobs.filter(job => {
    const cacheKey = `enrichment:${job.id}`;
    if (enrichmentCache.has(cacheKey)) {
      const cached = enrichmentCache.get(cacheKey)!;
      if (cached.expires > now) {
        // Apply cached enrichment data
        Object.assign(job, cached.data);
        return false; // Already enriched
      } else {
        enrichmentCache.delete(cacheKey);
      }
    }
    return needsEnrichment(job);
  });
  
  if (!jobsNeedingEnrichment.length) return jobs;
  
  console.log(`Enriching ${jobsNeedingEnrichment.length} jobs with AI data...`);
  
  // Process in batches to respect rate limits
  const batchSize = MAX_AI_ENRICHMENTS_PER_REQUEST;
  const batches = [];
  for (let i = 0; i < jobsNeedingEnrichment.length; i += batchSize) {
    batches.push(jobsNeedingEnrichment.slice(i, i + batchSize));
  }
  
  // Process first batch only to prevent overwhelming the API
  const batchToProcess = batches[0] || [];
  
  // Batch Firestore updates for efficiency
  const batch = admin.firestore().batch();
  let batchOperations = 0;
  const MAX_BATCH_SIZE = 500; // Firestore limit
  
  for (let i = 0; i < batchToProcess.length; i++) {
    const job = batchToProcess[i];
    const updateData: any = {};
    const enrichmentData: any = {};
    
    // Salary estimation
    if (!job.min_annual_salary_usd && !job.max_annual_salary_usd) {
      try {
        const prompt = `Estimate the annual salary range in USD for a '${job.job_title}' role${job.location ? ` in ${job.location}` : ''}. Respond ONLY with a valid JSON object in this exact format: {"min": 50000, "max": 75000}. Do not include any other text, code fences, or explanations.`;
        const aiResp = await genClient.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        
        const rawText = aiResp.text?.trim() || '';
        let jsonText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/,'').trim();
        
        const startIdx = jsonText.indexOf('{');
        const endIdx = jsonText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonText = jsonText.substring(startIdx, endIdx + 1);
        }
        
        try {
          const salaryData = JSON.parse(jsonText);
          if (salaryData.min) { 
            updateData.min_annual_salary_usd = salaryData.min; 
            job.min_annual_salary_usd = salaryData.min;
            enrichmentData.min_annual_salary_usd = salaryData.min;
          }          if (salaryData.max) { 
            updateData.max_annual_salary_usd = salaryData.max; 
            job.max_annual_salary_usd = salaryData.max;
            enrichmentData.max_annual_salary_usd = salaryData.max;
          }
        } catch (parseErr) {
          console.warn('Salary JSON parsing failed for job', job.id, parseErr);
        }
        
        if (i < batchToProcess.length - 1) await delay(AI_CALL_DELAY_MS);
      } catch (e) {
        console.warn('AI salary enrichment failed for job', job.id, e);
      }
    }
    
    // Missing fields enrichment (country, industry, tags)
    if (!job.country || !job.industry || !job.tags) {
      try {
        const prompt = `Based on the job title "${job.job_title}" and description "${job.description || job.short_description || ''}", extract the country, industry, and 5 relevant tags. Respond ONLY with a valid JSON object in this exact format: {"country": "string", "industry": "string", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}. Do not include any other text, code fences, or explanations.`;
        const aiResp = await genClient.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        
        const rawText = aiResp.text?.trim() || '';
        let jsonText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/,'').trim();
        
        const startIdx = jsonText.indexOf('{');
        const endIdx = jsonText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          jsonText = jsonText.substring(startIdx, endIdx + 1);
        }
        
        try {
          const info = JSON.parse(jsonText);
          if (info.country) { 
            updateData.country = info.country; 
            job.country = info.country;
            enrichmentData.country = info.country;
          }
          if (info.industry) { 
            updateData.industry = info.industry; 
            job.industry = info.industry;
            enrichmentData.industry = info.industry;
          }
          if (Array.isArray(info.tags)) { 
            updateData.tags = info.tags; 
            job.tags = info.tags;
            enrichmentData.tags = info.tags;
          }
        } catch (parseErr) {
          console.warn('Fields JSON parsing failed for job', job.id, parseErr);
        }
        
        if (i < batchToProcess.length - 1) await delay(AI_CALL_DELAY_MS);
      } catch (e) {
        console.warn('AI field enrichment failed for job', job.id, e);
      }
    }
    
    // Cache the enrichment data
    if (Object.keys(enrichmentData).length > 0) {
      const cacheKey = `enrichment:${job.id}`;
      enrichmentCache.set(cacheKey, { 
        data: enrichmentData, 
        expires: now + ENRICHMENT_CACHE_TTL_MS 
      });
    }
    
    // Add to Firestore batch if there are updates
    if (Object.keys(updateData).length > 0 && batchOperations < MAX_BATCH_SIZE) {
      const docRef = admin.firestore().collection('jobs').doc(String(job.id));
      batch.set(docRef, { 
        ...updateData, 
        cachedAt: FieldValue.serverTimestamp() 
      }, { merge: true });
      batchOperations++;
    }
  }
  
  // Commit the batch if there are operations
  if (batchOperations > 0) {
    try {
      await batch.commit();
      console.log(`Committed ${batchOperations} enrichment updates to Firestore`);
    } catch (e) {
      console.error('Error committing enrichment batch to Firestore:', e);
    }
  }
  
  return jobs;
}

// Support GET /api/jobs for front-end (query params) - OPTIMIZED
app.get('/api/jobs', async (req, res) => {
  try {
    if (!THEIRSTACK_API_KEY) {
      return res.status(500).json({ error: 'TheirStack API key not configured' });
    }

    // Parse query params for pagination and filters
    const page = req.query.page ? Number(req.query.page) : 0;
    const limit = req.query.limit ? Number(req.query.limit) : 3;  // default 3 per page
    const { what, where, salary_min, salary_max, contract_type } = req.query;

    // Create optimized cache key for this exact query
    const queryKey = JSON.stringify({
      page, limit, what, where, salary_min, salary_max, contract_type,
      sort: req.query.sort
    });
    
    // Check if we have this exact query cached
    const now = Date.now();
    if (jobCache.has(queryKey)) {
      const cached = jobCache.get(queryKey)!;
      if (cached.expires > now) {
        return res.json(cached.data);
      } else {
        jobCache.delete(queryKey);
      }
    }

    // Optimized Firestore query - only fetch what we need for this page
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let cachedJobs: any[] = [];
    let totalFilteredCount = 0;
    
    try {
      // Build query with only essential filters
      let query = admin.firestore().collection('jobs')
        .where('date_posted', '>=', cutoff);
      
      // Add text search optimization - use compound index friendly queries
      if (what && typeof what === 'string') {
        // Create search terms for better matching
        const searchTerms = what.toLowerCase().split(' ').filter(term => term.length > 2);
        if (searchTerms.length > 0) {
          // Use array-contains for tags/keywords if available, otherwise filter in memory
          query = query.where('job_title', '>=', what.toLowerCase())
                      .where('job_title', '<=', what.toLowerCase() + '\uf8ff');
        }
      }
      
      // Add salary filters if provided (requires compound index)
      if (salary_min && !salary_max) {
        query = query.where('min_annual_salary_usd', '>=', Number(salary_min));
      } else if (salary_max && !salary_min) {
        query = query.where('max_annual_salary_usd', '<=', Number(salary_max));
      }
      
      // Order by date for consistent pagination
      query = query.orderBy('date_posted', 'desc');
      
      // Implement efficient pagination with offset + limit
      const offset = page * limit;
      query = query.offset(offset).limit(limit + 10); // Fetch a few extra for better UX
      
      const snap = await query.get();
      cachedJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Get approximate total count (for better performance, we'll estimate)
      // In production, you might want to maintain a counter document
      totalFilteredCount = Math.max(cachedJobs.length + offset, offset + limit * 2);
      
    } catch (e) {
      console.error('Optimized Firestore read error:', e);
      // Fallback to simpler query without compound indexes
      try {
        const snap = await admin.firestore().collection('jobs')
          .where('date_posted', '>=', cutoff)
          .orderBy('date_posted', 'desc')
          .offset(page * limit)
          .limit(limit + 5)
          .get();
        cachedJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        totalFilteredCount = cachedJobs.length + (page * limit);
      } catch (fallbackError) {
        console.error('Firestore fallback read error:', fallbackError);
        return res.status(500).json({ error: 'Database query failed' });
      }
    }

    // Apply in-memory filters for complex criteria (to reduce index requirements)
    const filtered = cachedJobs.filter(job => {
      if (what && typeof what === 'string' && !job.job_title?.toLowerCase().includes(what.toLowerCase())) return false;
      if (where && typeof where === 'string' && !job.location?.toLowerCase().includes(where.toLowerCase()) && !job.long_location?.toLowerCase().includes(where.toLowerCase())) return false;
      if (salary_min && salary_max) {
        // Handle range queries in memory if no compound index
        if (job.min_annual_salary_usd && job.min_annual_salary_usd < Number(salary_min)) return false;
        if (job.max_annual_salary_usd && job.max_annual_salary_usd > Number(salary_max)) return false;
      }
      if (contract_type && job.employment_statuses && !job.employment_statuses.includes(contract_type as string)) return false;
      return true;
    });

    // Support sorting on filtered results
    const sortBy = req.query.sort as string;
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime());
    } else if (sortBy === 'salary') {
      filtered.sort((a, b) => (b.max_annual_salary_usd || 0) - (a.max_annual_salary_usd || 0));
    }

    // Take only what we need for this page
    const pageResults = filtered.slice(0, limit);

    // Enrich jobs with missing data using AI (only for this page's results)
    const enrichedResults = await enrichJobsWithAI(pageResults);

    // If we have results, cache and return them
    if (enrichedResults.length > 0) {
      const responseData = { 
        data: enrichedResults, 
        metadata: { 
          total_results: Math.max(totalFilteredCount, filtered.length),
          page,
          limit,
          has_more: enrichedResults.length >= limit
        } 
      };
      
      // Cache this specific query result
      jobCache.set(queryKey, { 
        data: responseData, 
        expires: now + (CACHE_TTL_MS / 2) // Shorter cache for paginated results
      });
      
      return res.json(responseData);
    }

    // If no cached results, try TheirStack API as fallback
    const apiFilters: any = { posted_at_max_age_days: 30, page, limit };
    if (what && typeof what === 'string') apiFilters.job_title_or = [what.trim()];
    if (where && typeof where === 'string') apiFilters.job_location_pattern_or = [where.trim()];
    if (salary_min) apiFilters.min_annual_salary_usd = Number(salary_min);
    if (salary_max) apiFilters.max_annual_salary_usd = Number(salary_max);
    if (contract_type && typeof contract_type === 'string' && contract_type !== 'all') {
      apiFilters.employment_statuses = [contract_type];
    }

    let apiJobs: any[] = [];
    let apiMetadata: any = { total_results: 0 };
    
    try {
      const apiRes = await axios.post(
        'https://api.theirstack.com/v1/jobs/search',
        apiFilters,
        {
          headers: { 'Authorization': `Bearer ${THEIRSTACK_API_KEY}`, 'Content-Type': 'application/json' },
          validateStatus: () => true,
          timeout: 10000 // 10 second timeout
        }
      );
      
      if (apiRes.status === 402) {
        console.warn('TheirStack rate limit reached');
        return res.status(429).json({ 
          error: 'Rate limit reached. Please try again later.', 
          metadata: { total_results: 0 } 
        });
      }
      
      if (apiRes.status === 200 && apiRes.data) {
        const { metadata, data } = apiRes.data;
        apiMetadata = metadata || { total_results: 0 };
        apiJobs = Array.isArray(data) ? data : [];
      }
    } catch (apiError) {
      console.warn('TheirStack API error:', apiError);
      // Don't fail completely, just return empty results
    }

    // Enrich and persist new API jobs
    if (apiJobs.length > 0) {
      const enrichedApiJobs = await enrichJobsWithAI(apiJobs);
      
      // Batch persist to Firestore
      try {
        const batch = admin.firestore().batch();
        enrichedApiJobs.forEach((job: any) => {
          const docRef = admin.firestore().collection('jobs').doc(String(job.id));
          batch.set(docRef, { 
            ...job, 
            date_posted: job.date_posted || job.created, 
            cachedAt: FieldValue.serverTimestamp() 
          }, { merge: true });
        });
        await batch.commit();
        console.log(`Persisted ${enrichedApiJobs.length} new jobs to Firestore`);
      } catch (err) {
        console.error('Firestore batch persist error:', err);
      }
      
      const responseData = { 
        data: enrichedApiJobs, 
        metadata: { 
          ...apiMetadata,
          page,
          limit,
          has_more: enrichedApiJobs.length >= limit
        } 
      };
      
      // Cache the result
      jobCache.set(queryKey, { 
        data: responseData, 
        expires: now + (CACHE_TTL_MS / 2)
      });
      
      return res.json(responseData);
    }

    // No results found
    return res.json({ 
      data: [], 
      metadata: { 
        total_results: 0,
        page,
        limit,
        has_more: false
      } 
    });
      } catch (err: any) {
    console.error('Error in GET /api/jobs:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch jobs', 
      details: err.message 
    });
  }
});

// Google GenAI resume parsing endpoint
app.post('/api/parse-resume', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.uid;
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    // Lookup resume file in Firestore (assuming resumes are stored in a "resumes" collection)
    const resumeDoc = await admin.firestore().collection('resumes').doc(filename).get();
    if (!resumeDoc.exists) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    const resumeData = resumeDoc.data();
    if (!resumeData || !resumeData.url) {
      return res.status(500).json({ error: 'Resume data is corrupt' });
    }
    // Return parsed data
    res.json({ parsedData: {} });
  } catch (err) {
    console.error('Error parsing resume:', err);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

// AI-based salary estimate endpoint
// Optional: GET endpoint for health check
app.get('/api/jobs/health', (_req, res) => {
    res.json({ status: 'TheirStack jobs API proxy running' });
});

// Salary estimate via Gemini AI when no salary data
app.get('/api/salary-estimate', async (req, res) => {
  try {
    const jobId = req.query.id as string;
    const title = req.query.title as string;
    const location = req.query.location as string || '';
    if (!title) {
      return res.status(400).json({ error: 'Missing title parameter.' });
    }    // Construct prompt for Gemini
    const promptText = `Estimate the annual salary range in USD for a '${title}' role${location ? ` in ${location}` : ''}. Respond ONLY with a valid JSON object in this exact format: {"min": 50000, "max": 75000}. Do not include any other text, code fences, or explanations.`;// Call Gemini via GenAI SDK
    const aiResponse = await genClient.models.generateContent({ model: 'gemini-2.0-flash', contents: promptText });
    const rawText = aiResponse.text?.trim() || '';
    
    let formatted: string;
    let rangeObj: { min: number; max: number };
    
    // Try to parse as JSON first
    try {
      let jsonText = rawText;
      // Remove markdown code fences
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/,'').trim();
      
      // Find JSON object boundaries
      const startIdx = jsonText.indexOf('{');
      const endIdx = jsonText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonText = jsonText.substring(startIdx, endIdx + 1);
      }
      
      rangeObj = JSON.parse(jsonText);
      formatted = `${rangeObj.min}-${rangeObj.max}`;
    } catch {
      // Fallback to plain "min-max" format parsing
      formatted = rawText;
      const parts = rawText.split('-').map(p => Number(p.replace(/\D/g, '')));
      rangeObj = { min: parts[0] || 0, max: parts[1] || 0 };
    }
    // Persist estimate to Firestore
    if (jobId) {
      try {
        const docRef = admin.firestore().collection('jobs').doc(jobId);
        await docRef.set({
          min_annual_salary_usd: rangeObj.min,
          max_annual_salary_usd: rangeObj.max,
          cachedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error('Error persisting salary estimate to Firestore:', e);
      }
    }    res.json({ range: formatted });
  } catch (err) {
    console.error('Error in /api/salary-estimate:', err);
    res.status(500).json({ error: 'Failed to estimate salary' });
  }
});

// Start server when run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
