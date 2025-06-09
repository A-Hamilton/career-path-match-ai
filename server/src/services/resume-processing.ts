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
      const model = aiConfig.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;const rawAnalysis = response.text()?.trim() || 'No analysis available.';
      
      // Clean and parse the AI response
      let cleanedAnalysis = rawAnalysis
        .replace(/```json|```/g, '')
        .trim();
      
      // Remove comments and fix common JSON issues
      cleanedAnalysis = this.cleanJsonResponse(cleanedAnalysis);
      
      let parsedAnalysis: ParsedResumeData;
      try {
        parsedAnalysis = JSON.parse(cleanedAnalysis);
      } catch (parseError) {
        console.error('Failed to parse AI response:', cleanedAnalysis);
        console.error('Parse error:', parseError);
        
        // Try to extract JSON from the response
        const jsonMatch = cleanedAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedAnalysis = JSON.parse(this.cleanJsonResponse(jsonMatch[0]));
          } catch (secondParseError) {
            throw new Error(`Invalid AI response format: ${secondParseError}`);
          }
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }      // Validate required fields
      this.validateAndSanitizeParsedData(parsedAnalysis);

      return parsedAnalysis;

    } catch (error) {
      console.error('AI parsing error:', error);
      
      // Fallback to basic parsing strategy
      const fallbackData = this.createFallbackResumeData(content);
      console.warn('Falling back to basic resume parsing strategy');
      return fallbackData;
    }  }

  /**
   * Clean JSON response by removing comments and fixing common issues
   */
  private cleanJsonResponse(jsonString: string): string {
    // Remove code fences and comments
    jsonString = jsonString.replace(/```json|```/g, '');
    jsonString = jsonString.replace(/\/\*.*?\*\//gs, '');
    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    // Remove trailing commas
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
    // Extract JSON object if extra text is present
    const match = jsonString.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return jsonString.trim();
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

  /**
   * Create fallback resume data when AI parsing fails
   */
  private createFallbackResumeData(rawText: string): ParsedResumeData {
    console.warn('Creating fallback resume data due to AI parsing failure');
    
    // Basic text analysis for fallback
    const text = rawText.toLowerCase();
    const lines = rawText.split('\n').filter(line => line.trim());
    
    return {
      workExperience: this.extractWorkExperienceFromText(lines),
      skills: this.extractSkillsFromText(text),
      education: this.extractEducationFromText(lines),
      projects: [],
      certifications: [],
      summary: lines.slice(0, 3).join(' ').substring(0, 200) + '...',
      strengths: ['Experience in relevant field'],
      improvements: ['Add more specific details', 'Include quantifiable achievements'],
      keywords: {
        found: this.extractBasicKeywords(text),
        missing: ['leadership', 'teamwork', 'communication', 'problem-solving']
      }
    };
  }
  /**
   * Enhanced validation that also sanitizes data
   */
  private validateAndSanitizeParsedData(data: any): void {
    const requiredFields = [
      'workExperience', 'skills', 'education', 'projects', 
      'certifications', 'summary', 'strengths', 'improvements', 'keywords'
    ];

    // Ensure all required fields exist and are arrays/objects as expected
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.warn(`Missing field ${field}, adding default`);
        if (['workExperience', 'skills', 'education', 'projects', 'certifications', 'strengths', 'improvements'].includes(field)) {
          data[field] = [];
        } else if (field === 'summary') {
          data[field] = 'No summary available';
        } else if (field === 'keywords') {
          data[field] = { found: [], missing: [] };
        }
      }
    }

    // Sanitize arrays
    ['workExperience', 'skills', 'education', 'projects', 'certifications', 'strengths', 'improvements'].forEach(field => {
      if (!Array.isArray(data[field])) {
        console.warn(`Field ${field} is not an array, converting`);
        data[field] = [];
      }
      
      // Limit array sizes to prevent excessive data
      if (data[field].length > 20) {
        console.warn(`Field ${field} has ${data[field].length} items, truncating to 20`);
        data[field] = data[field].slice(0, 20);
      }
    });

    // Sanitize work experience entries
    if (Array.isArray(data.workExperience)) {
      data.workExperience = data.workExperience.map((exp: any) => {
        return {
          title: this.sanitizeString(exp.title, 'Job Title'),
          company: this.sanitizeString(exp.company, 'Company'),
          duration: this.sanitizeString(exp.duration, 'Duration'),
          description: this.sanitizeString(exp.description, 'Job description', 500)
        };
      });
    }

    // Sanitize education entries
    if (Array.isArray(data.education)) {
      data.education = data.education.map((edu: any) => {
        return {
          institution: this.sanitizeString(edu.institution, 'Institution'),
          degree: this.sanitizeString(edu.degree, 'Degree'),
          field: this.sanitizeString(edu.field, 'Field of Study'),
          year: this.sanitizeString(edu.year, 'Year')
        };
      });
    }

    // Sanitize project entries
    if (Array.isArray(data.projects)) {
      data.projects = data.projects.map((project: any) => {
        return {
          name: this.sanitizeString(project.name, 'Project Name'),
          description: this.sanitizeString(project.description, 'Project description', 300),
          technologies: Array.isArray(project.technologies) ? project.technologies.slice(0, 10) : [],
          url: this.sanitizeString(project.url, '')
        };
      });
    }

    // Sanitize certification entries
    if (Array.isArray(data.certifications)) {
      data.certifications = data.certifications.map((cert: any) => {
        return {
          name: this.sanitizeString(cert.name, 'Certification'),
          issuer: this.sanitizeString(cert.issuer, 'Issuer'),
          date: this.sanitizeString(cert.date, 'Date'),
          url: this.sanitizeString(cert.url, '')
        };
      });
    }

    // Sanitize skills array
    if (Array.isArray(data.skills)) {
      data.skills = data.skills
        .filter((skill: any) => typeof skill === 'string' && skill.trim())
        .map((skill: string) => skill.trim().slice(0, 50))
        .slice(0, 30);
    }

    // Sanitize strengths and improvements
    ['strengths', 'improvements'].forEach(field => {
      if (Array.isArray(data[field])) {
        data[field] = data[field]
          .filter((item: any) => typeof item === 'string' && item.trim())
          .map((item: string) => item.trim().slice(0, 200))
          .slice(0, 10);
      }
    });

    // Sanitize keywords object
    if (!data.keywords || typeof data.keywords !== 'object') {
      data.keywords = { found: [], missing: [] };
    }
    if (!Array.isArray(data.keywords.found)) data.keywords.found = [];
    if (!Array.isArray(data.keywords.missing)) data.keywords.missing = [];

    // Sanitize keywords arrays
    ['found', 'missing'].forEach(keywordType => {
      data.keywords[keywordType] = data.keywords[keywordType]
        .filter((keyword: any) => typeof keyword === 'string' && keyword.trim())
        .map((keyword: string) => keyword.trim().toLowerCase().slice(0, 30))
        .slice(0, 20);
    });

    // Sanitize summary string
    if (typeof data.summary !== 'string') {
      data.summary = 'No summary available';
    } else {
      data.summary = data.summary.trim().slice(0, 1000);
      if (!data.summary) {
        data.summary = 'No summary available';
      }
    }

    // Add validation timestamp
    data._validated = new Date().toISOString();
  }

  /**
   * Sanitize string values with fallbacks
   */
  private sanitizeString(value: any, fallback: string, maxLength: number = 100): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    
    const sanitized = value.trim().slice(0, maxLength);
    return sanitized || fallback;
  }

  /**
   * Extract basic work experience from text lines
   */
  private extractWorkExperienceFromText(lines: string[]): any[] {
    const experience: any[] = [];
    const jobTitlePatterns = /\b(developer|engineer|manager|analyst|specialist|coordinator|director|lead|senior|junior)\b/i;
    
    lines.forEach(line => {
      if (jobTitlePatterns.test(line) && line.length > 10) {
        experience.push({
          title: line.substring(0, 100),
          company: 'Company Name',
          duration: 'Date Range',
          description: 'Professional role with relevant responsibilities'
        });
      }
    });

    return experience.slice(0, 5); // Limit to 5 entries
  }

  /**
   * Extract skills from text using common patterns
   */
  private extractSkillsFromText(text: string): string[] {
    const skillPatterns = [
      /\b(javascript|python|java|react|angular|vue|node\.?js|typescript|html|css|sql|mongodb|postgresql|aws|azure|docker|kubernetes|git)\b/gi,
      /\b(communication|leadership|teamwork|problem.solving|analytical|creative|organizational)\b/gi
    ];
    
    const skills = new Set<string>();
    
    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => skills.add(match.toLowerCase()));
    });

    return Array.from(skills).slice(0, 15);
  }

  /**
   * Extract education from text lines
   */
  private extractEducationFromText(lines: string[]): any[] {
    const education: any[] = [];
    const educationPatterns = /\b(university|college|bachelor|master|phd|degree|diploma|certification)\b/i;
    
    lines.forEach(line => {
      if (educationPatterns.test(line) && line.length > 10) {
        education.push({
          institution: 'Educational Institution',
          degree: line.substring(0, 100),
          field: 'Field of Study',
          year: 'Year'
        });
      }
    });

    return education.slice(0, 3);
  }

  /**
   * Extract basic keywords from text
   */
  private extractBasicKeywords(text: string): string[] {
    const commonKeywords = [
      'management', 'development', 'analysis', 'design', 'implementation',
      'collaboration', 'innovation', 'efficiency', 'quality', 'performance'
    ];
    
    return commonKeywords.filter(keyword => text.includes(keyword.toLowerCase())).slice(0, 10);
  }

  // ...existing code...
}

export const resumeService = new ResumeProcessingService();
