import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import admin from 'firebase-admin';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises'; // Import the 'fs/promises' module
import pdf from 'pdf-parse';

// Load environment variables from the server directory
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
config({ path: envPath });
console.log('Environment variables loaded');
console.log('ADZUNA_APP_ID exists:', !!process.env.ADZUNA_APP_ID);
console.log('ADZUNA_API_KEY exists:', !!process.env.ADZUNA_API_KEY);

// Initialize Firebase Admin SDK for server-side token verification
// Uses application default credentials; set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON file
admin.initializeApp({ credential: admin.credential.applicationDefault() });

const app = express();
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
      const pdfData = await pdf(fileBuffer);
      fileContent = pdfData.text;
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

// Simple in-memory cache for job search results
const jobCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to create a cache key from the request body
function getCacheKey(body: any) {
    return JSON.stringify(body);
}

// Proxy TheirStack job search (avoid CORS, with caching)
app.post('/api/jobs', async (req, res) => {
    try {
        if (!THEIRSTACK_API_KEY) {
            return res.status(500).json({ error: 'TheirStack API key not configured' });
        }
        // Accept filters from frontend (body)
        const filters = req.body && Object.keys(req.body).length ? req.body : { posted_at_max_age_days: 7, page: 0, limit: 20 };
        // Ensure at least one required filter
        if (!filters.posted_at_max_age_days && !filters.posted_at_gte && !filters.posted_at_lte && !filters.company_name_or) {
            return res.status(400).json({ error: 'At least one required filter (posted_at_max_age_days, posted_at_gte, posted_at_lte, company_name_or) must be provided.' });
        }
        const cacheKey = getCacheKey(filters);
        const now = Date.now();
        // Check cache
        if (jobCache.has(cacheKey)) {
            const cached = jobCache.get(cacheKey)!;
            if (cached.expires > now) {
                return res.json(cached.data);
            } else {
                jobCache.delete(cacheKey);
            }
        }
        // Not cached or expired, fetch from TheirStack
        const response = await axios.post(
            'https://api.theirstack.com/v1/jobs/search',
            filters,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${THEIRSTACK_API_KEY}`,
                },
            }
        );
        // Cache the result
        jobCache.set(cacheKey, { data: response.data, expires: now + CACHE_TTL_MS });
        res.json(response.data);
    } catch (err) {
        const error = err as any;
        console.error('TheirStack API error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch jobs',
            details: error.response?.data || error.message,
        });
    }
});

// Support GET /api/jobs for front-end (query params)
app.get('/api/jobs', async (req, res) => {
    try {
        if (!THEIRSTACK_API_KEY) {
            return res.status(500).json({ error: 'TheirStack API key not configured' });
        }
        // Build filters from query params
        const page = req.query.page ? Number(req.query.page) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 25;
        const { what, where, salary_min, salary_max, contract_type } = req.query;
        // Construct filters body for TheirStack
        const filters: any = { posted_at_max_age_days: 30, page, limit };
        if (what && typeof what === 'string') {
            filters.job_title_or = [what.trim()];
        }
        if (where && typeof where === 'string') {
            filters.job_location_pattern_or = [where.trim()];
        }
        if (salary_min) {
            filters.min_annual_salary_usd = Number(salary_min);
        }
        if (salary_max) {
            filters.max_annual_salary_usd = Number(salary_max);
        }
        if (contract_type && typeof contract_type === 'string' && contract_type !== 'all') {
            filters.employment_statuses = [contract_type];
        }
        // Caching logic
        const cacheKey = getCacheKey(filters);
        const now = Date.now();
        if (jobCache.has(cacheKey)) {
            const cached = jobCache.get(cacheKey)!;
            if (cached.expires > now) {
                return res.json(cached.data);
            }
            jobCache.delete(cacheKey);
        }
        // Fetch from TheirStack API
        const response = await axios.post(
            'https://api.theirstack.com/v1/jobs/search',
            filters,
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${THEIRSTACK_API_KEY}` } }
        );
        jobCache.set(cacheKey, { data: response.data, expires: now + CACHE_TTL_MS });
        res.json(response.data);
    } catch (err: any) {
        console.error('TheirStack API error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to fetch jobs', details: err.response?.data || err.message });
    }
});

// Optional: GET endpoint for health check
app.get('/api/jobs/health', (_req, res) => {
    res.json({ status: 'TheirStack jobs API proxy running' });
});

// Salary estimate via Gemini AI when no salary data
app.get('/api/salary-estimate', async (req, res) => {
    const { title, location } = req.query;
    if (!title) return res.status(400).json({ error: 'Missing title parameter' });
    const content = `Based on the job title "${title}" and location "${location || 'unspecified'}", what is an expected annual salary range in USD? Respond only with the range, e.g., "$70k-$90k".`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: content,
        });
        const range = response.text?.trim() || '';
        res.json({ range });
    } catch (err: any) {
        console.error('Gemini salary estimate error:', err);
        res.status(500).json({ error: 'Failed to estimate salary' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
