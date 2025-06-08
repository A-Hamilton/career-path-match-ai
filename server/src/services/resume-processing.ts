import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { aiConfig } from '../config/ai';
import { dbService } from './database';
import { AuthenticatedRequest } from './auth';

export interface ParsedResumeData {
  workExperience: any[];
  skills: string[];
  education: any[];
  projects: any[];
  certifications: any[];
  summary: string;
  strengths: string[];
  improvements: string[];
  keywords: {
    found: string[];
    missing: string[];
  };
  score?: number;
}

export interface ResumeUploadResult {
  filename: string;
  resumeId: string;
  parsedData: ParsedResumeData;
  score: number;
}

class ResumeProcessingService {
  private readonly uploadPath = './uploads';
  private readonly allowedMimeTypes = ['application/pdf', 'text/plain'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  private multerInstance: multer.Multer;

  constructor() {
    // Configure multer for file uploads
    this.multerInstance = multer({
      dest: this.uploadPath,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only PDF and text files are allowed.'));
        }
      }
    });
  }

  /**
   * Get multer middleware for single file upload
   */
  getUploadMiddleware() {
    return this.multerInstance.single('resume');
  }

  /**
   * Process uploaded resume file
   */
  async processResume(req: AuthenticatedRequest): Promise<ResumeUploadResult> {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    if (!req.user) {
      throw new Error('User authentication required');
    }

    const filePath = path.join(__dirname, '..', '..', req.file.path);

    try {
      // Extract text content from file
      const fileContent = await this.extractTextContent(req.file, filePath);

      // Parse resume using AI
      const parsedData = await this.parseResumeWithAI(fileContent);

      // Calculate resume score
      const score = this.calculateResumeScore(parsedData);
      parsedData.score = score;

      // Store resume in database
      const resumeId = await dbService.createResume({
        userId: req.user.uid,
        filename: req.file.originalname,
        url: filePath, // In production, this would be a cloud storage URL
        parsedData
      });

      // Clean up uploaded file
      await this.cleanupFile(filePath);

      return {
        filename: req.file.originalname,
        resumeId,
        parsedData,
        score
      };

    } catch (error) {
      // Clean up file on error
      await this.cleanupFile(filePath);
      throw error;
    }
  }

  /**
   * Parse existing resume by filename
   */
  async parseExistingResume(filename: string, userId: string): Promise<ParsedResumeData> {
    const resume = await dbService.getResumeByFilename(filename, userId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }

    if (!resume.url) {
      throw new Error('Resume data is corrupt - missing file URL');
    }

    // If already parsed, return cached data
    if (resume.parsedData) {
      return resume.parsedData;
    }

    try {
      // Re-parse the resume
      const fileContent = await fs.readFile(resume.url, 'utf-8');
      const parsedData = await this.parseResumeWithAI(fileContent);
      
      // Update database with parsed data
      await dbService.updateResumeParsedData(resume.id, parsedData);

      return parsedData;

    } catch (error) {
      console.error('Error parsing existing resume:', error);
      throw new Error('Failed to parse resume');
    }
  }

  /**
   * Get user's resumes with parsed data
   */
  async getUserResumes(userId: string): Promise<any[]> {
    return await dbService.getUserResumes(userId);
  }

  /**
   * Extract text content from uploaded file
   */
  private async extractTextContent(file: Express.Multer.File, filePath: string): Promise<string> {
    try {
      if (file.mimetype === 'application/pdf') {
        const fileBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(fileBuffer);
        return pdfData.text;
      } else {
        // For text files
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch (error) {
      console.error('File extraction error:', error);
      throw new Error(`Failed to extract content from ${file.mimetype} file`);
    }
  }

  /**
   * Parse resume content using AI
   */
  private async parseResumeWithAI(content: string): Promise<ParsedResumeData> {
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
      ${content}

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
    `;    try {
      const model = aiConfig.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      const rawAnalysis = response.text()?.trim() || 'No analysis available.';
      
      // Clean and parse the AI response
      const cleanedAnalysis = rawAnalysis.replace(/```json|```/g, '').trim();
      
      let parsedAnalysis: ParsedResumeData;
      try {
        parsedAnalysis = JSON.parse(cleanedAnalysis);
      } catch (parseError) {
        console.error('Failed to parse AI response:', cleanedAnalysis);
        throw new Error('Invalid AI response format');
      }

      // Validate required fields
      this.validateParsedData(parsedAnalysis);

      return parsedAnalysis;

    } catch (error) {
      console.error('AI parsing error:', error);
      throw new Error(`Failed to parse resume with AI: ${error}`);
    }
  }

  /**
   * Validate parsed resume data structure
   */
  private validateParsedData(data: any): void {
    const requiredFields = [
      'workExperience', 'skills', 'education', 'projects', 
      'certifications', 'summary', 'strengths', 'improvements', 'keywords'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!data.keywords.found || !data.keywords.missing) {
      throw new Error('Invalid keywords structure');
    }
  }

  /**
   * Calculate resume score based on completeness and quality
   */
  private calculateResumeScore(data: ParsedResumeData): number {
    let score = 0;
    let maxScore = 100;

    // Work experience (25 points)
    if (data.workExperience && data.workExperience.length > 0) {
      score += Math.min(25, data.workExperience.length * 8);
    }

    // Skills (20 points)
    if (data.skills && data.skills.length > 0) {
      score += Math.min(20, data.skills.length * 2);
    }

    // Education (15 points)
    if (data.education && data.education.length > 0) {
      score += Math.min(15, data.education.length * 7);
    }

    // Projects (15 points)
    if (data.projects && data.projects.length > 0) {
      score += Math.min(15, data.projects.length * 5);
    }

    // Certifications (10 points)
    if (data.certifications && data.certifications.length > 0) {
      score += Math.min(10, data.certifications.length * 3);
    }

    // Professional summary (10 points)
    if (data.summary && data.summary.length > 50) {
      score += 10;
    } else if (data.summary && data.summary.length > 20) {
      score += 5;
    }

    // Keywords optimization (5 points)
    if (data.keywords && data.keywords.found && data.keywords.found.length > 5) {
      score += 5;
    } else if (data.keywords && data.keywords.found && data.keywords.found.length > 2) {
      score += 3;
    }

    return Math.min(score, maxScore);
  }

  /**
   * Get resume improvement suggestions
   */
  async getResumeImprovements(resumeId: string, userId: string): Promise<string[]> {
    const resume = await dbService.getResumeByFilename(resumeId, userId);
    
    if (!resume || !resume.parsedData) {
      throw new Error('Resume not found or not parsed');
    }

    const suggestions: string[] = [];
    const data = resume.parsedData;

    // Check for missing sections
    if (!data.workExperience || data.workExperience.length === 0) {
      suggestions.push('Add work experience section with specific achievements and responsibilities');
    }

    if (!data.skills || data.skills.length < 5) {
      suggestions.push('Include more relevant technical and soft skills');
    }

    if (!data.projects || data.projects.length === 0) {
      suggestions.push('Add project section to showcase practical experience');
    }

    if (!data.certifications || data.certifications.length === 0) {
      suggestions.push('Include relevant certifications or professional development');
    }

    if (!data.summary || data.summary.length < 50) {
      suggestions.push('Add a compelling professional summary at the top');
    }

    // Keyword optimization suggestions
    if (data.keywords && data.keywords.missing && data.keywords.missing.length > 0) {
      suggestions.push(`Consider adding these keywords: ${data.keywords.missing.slice(0, 5).join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Clean up uploaded file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return this.allowedMimeTypes;
  }

  /**
   * Get upload configuration
   */
  getUploadConfig() {
    return {
      maxFileSize: this.maxFileSize,
      allowedTypes: this.allowedMimeTypes,
      uploadPath: this.uploadPath
    };
  }
}

export const resumeService = new ResumeProcessingService();
