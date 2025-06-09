import { Query, DocumentData, FieldValue } from '@google-cloud/firestore';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { validateJobLocation } from '../utils/location-validator';

export interface Job {
  id: string;
  job_title: string;
  company?: string;
  location?: string;
  long_location?: string;
  description?: string;
  short_description?: string;
  date_posted: string;
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  country?: string;
  industry?: string;
  tags?: string[];
  employment_statuses?: string[];
  url?: string;
  final_url?: string;
  remote?: boolean;
  cachedAt?: any;
}

export interface Resume {
  id: string;
  userId: string;
  filename: string;
  url: string;
  parsedData?: any;
  uploadedAt: any;
}

class DatabaseService {
  private readonly jobsCollection = 'jobs';
  private readonly resumesCollection = 'resumes';
  private readonly batchSize = 500;

  /**
   * Get recent jobs within a date cutoff
   */
  async getRecentJobs(cutoffDate: string, limit: number = 100): Promise<Job[]> {
    try {
      const snapshot = await db.getFirestore()
        .collection(this.jobsCollection)
        .where('date_posted', '>=', cutoffDate)
        .orderBy('date_posted', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
    } catch (error) {
      console.error('Error getting recent jobs:', error);
      throw new Error(`Failed to fetch recent jobs: ${error}`);
    }
  }
  /**
   * Get jobs with advanced filtering and pagination
   */
  async getJobsWithFilters(filters: {
    cutoffDate?: string;
    salaryMin?: number;
    salaryMax?: number;
    location?: string;
    jobTitle?: string;
    offset?: number; // Starting index for results
    limit?: number;  // Number of items per page
    remote?: boolean; // Add remote filter
  }): Promise<Job[]> {
    try {
      let query: Query<DocumentData> = db.getFirestore().collection(this.jobsCollection);

      // Apply Firestore-supported filters (date, single-bound salary)
      if (filters.cutoffDate) {
        query = query.where('date_posted', '>=', filters.cutoffDate);
      }
      // These are handled by Firestore only if it's a single-bound filter.
      // If both salaryMin and salaryMax are present, it's handled by in-memory filtering later.
      if (filters.salaryMin != null && filters.salaryMax == null) {
        query = query.where('min_annual_salary_usd', '>=', filters.salaryMin);
      } else if (filters.salaryMax != null && filters.salaryMin == null) {
        query = query.where('max_annual_salary_usd', '<=', filters.salaryMax);
      }
      
      // Order by date for consistent results
      query = query.orderBy('date_posted', 'desc');

      const needsInMemoryFiltering = !!(filters.jobTitle || filters.location || (filters.salaryMin != null && filters.salaryMax != null));
      let jobs: Job[];
      const DEFAULT_PAGE_LIMIT = 10;

      if (needsInMemoryFiltering) {
        // Fetch a larger set for in-memory filtering.
        // This limit should be high enough to get enough candidates for several pages after filtering.
        // Consider making this configurable or dynamically adjusting if performance issues arise.
        const preliminaryLimit = 1000; 
        const snapshot = await query.limit(preliminaryLimit).get();
        jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        console.log(`[DB] Raw jobs fetched for in-memory filtering: ${jobs.length}`);

        // In-memory filtering for jobTitle
        if (filters.jobTitle) {
          const search = filters.jobTitle.trim().toLowerCase();
          jobs = jobs.filter(job => (job.job_title || '').toLowerCase().includes(search));
        }

        // In-memory filtering for location
        if (filters.location) {
          const loc = filters.location.trim().toLowerCase();
          jobs = jobs.filter(job => {
            const location = (job.location || '').toLowerCase();
            const longLocation = (job.long_location || '').toLowerCase();
            const city = ((job as any).city || '').toLowerCase();
            const country = (job.country || '').toLowerCase();
            
            if (location === loc || city === loc) return true;
            if (location.startsWith(loc + ',') || longLocation.startsWith(loc + ',')) return true;
            const commaPattern = new RegExp(`(^|,\\s*)${loc.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\\\$&')}(\\s*,|$)`, 'i');
            if (commaPattern.test(location) || commaPattern.test(longLocation)) return true;
            if (loc.length > 2 && country === loc) return true; // Basic country match
            return false;
          });
        }
        
        // In-memory filtering for salary range (if both min and max are specified)
        if (filters.salaryMin != null && filters.salaryMax != null) {
          jobs = jobs.filter(job => {
            const minSalary = job.min_annual_salary_usd;
            const maxSalary = job.max_annual_salary_usd;
            if (minSalary === undefined && maxSalary === undefined) return false;
            if (minSalary !== undefined && maxSalary === undefined) {
              return minSalary >= filters.salaryMin! && minSalary <= filters.salaryMax!;
            }
            if (maxSalary !== undefined && minSalary === undefined) {
              return maxSalary >= filters.salaryMin! && maxSalary <= filters.salaryMax!;
            }
            if (minSalary !== undefined && maxSalary !== undefined) {
              return minSalary <= filters.salaryMax! && maxSalary >= filters.salaryMin!;
            }
            return false;
          });
        }

        // Validate location data for filtered jobs
        try {
          const { validateJobLocation } = require('../utils/location-validator');
          jobs = jobs.map(job => validateJobLocation(job));
        } catch (error) {
          console.warn('Failed to validate job locations during in-memory filtering:', error);
        }

        // Deduplicate jobs by ID (prevents duplicates after in-memory filtering)
        const seenIds = new Set();
        jobs = jobs.filter(job => {
          if (seenIds.has(job.id)) return false;
          seenIds.add(job.id);
          return true;
        });

        // In-memory filtering for remote/on-site status if filter is provided
        if (filters.remote !== undefined) {
          jobs = jobs.filter(job => job.remote === filters.remote);
        }

        // Normalize remote property for all jobs (ensure boolean or false)
        jobs = jobs.map(job => ({ ...job, remote: !!job.remote }));

        console.log(`[DB] Jobs after all in-memory filters and deduplication: ${jobs.length}`);

        // Apply pagination to the in-memory filtered results
        const startIndex = filters.offset || 0;
        const effectiveLimit = filters.limit || DEFAULT_PAGE_LIMIT;
        jobs = jobs.slice(startIndex, startIndex + effectiveLimit);

      } else {
        // No complex in-memory filtering needed. Firestore can handle pagination.
        if (filters.offset) {
          query = query.offset(filters.offset);
        }
        const effectiveLimit = filters.limit || DEFAULT_PAGE_LIMIT;
        query = query.limit(effectiveLimit);
        
        const snapshot = await query.get();
        jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        console.log(`[DB] Jobs fetched directly from Firestore with pagination: ${jobs.length}`);
        
        // Validate location data
        try {
          const { validateJobLocation } = require('../utils/location-validator');
          jobs = jobs.map(job => validateJobLocation(job));
        } catch (error) {
          console.warn('Failed to validate job locations for Firestore-paginated results:', error);
        }
      }
      
      console.log(`[DB] Jobs returned after pagination stage: ${jobs.length}`);
      return jobs;

    } catch (error) {
      console.error('Error getting jobs with filters:', error);
      throw new Error(`Failed to fetch filtered jobs: ${error}`);
    }
  }
  /**
   * Count jobs matching advanced filters (without pagination)
   */
  async countJobsWithFilters(filters: {
    cutoffDate?: string;
    salaryMin?: number;
    salaryMax?: number;
    location?: string;
    jobTitle?: string;
    remote?: boolean; // Add remote filter for count
  }): Promise<number> {
    try {
      let query = db.getFirestore().collection(this.jobsCollection) as Query<DocumentData>;

      if (filters.cutoffDate) {
        query = query.where('date_posted', '>=', filters.cutoffDate);
      }

      // Apply Firestore query for single-bound salary filters
      if (filters.salaryMin != null && filters.salaryMax == null) {
        query = query.where('min_annual_salary_usd', '>=', filters.salaryMin);
      } else if (filters.salaryMax != null && filters.salaryMin == null) {
        query = query.where('max_annual_salary_usd', '<=', filters.salaryMax);
      }
      // If both salaryMin and salaryMax are present, or if jobTitle/location filters are present,
      // we will need to do in-memory filtering.

      // Check if in-memory filtering is needed for jobTitle, location, or a salary range
      if (filters.jobTitle || filters.location || (filters.salaryMin != null && filters.salaryMax != null)) {
        // Fetch up to 1000 documents that match the base criteria for in-memory filtering.
        const limitedQuery = query.limit(1000);
        const snapshot = await limitedQuery.get();
        
        let jobs = snapshot.docs.map(doc => validateJobLocation({ id: doc.id, ...doc.data() } as any as Job));

        // In-memory filter for salary range if both min and max are specified
        if (filters.salaryMin != null && filters.salaryMax != null) {
            jobs = jobs.filter(job => {
                const minSalary = job.min_annual_salary_usd;
                const maxSalary = job.max_annual_salary_usd;

                if (minSalary === undefined && maxSalary === undefined) return false;

                if (minSalary !== undefined && maxSalary === undefined) { // Job has only min_salary
                    return minSalary >= filters.salaryMin! && minSalary <= filters.salaryMax!;
                }
                if (maxSalary !== undefined && minSalary === undefined) { // Job has only max_salary
                    return maxSalary >= filters.salaryMin! && maxSalary <= filters.salaryMax!;
                }
                if (minSalary !== undefined && maxSalary !== undefined) { // Job has a salary range
                    return minSalary <= filters.salaryMax! && maxSalary >= filters.salaryMin!; // Check for overlap
                }
                return false;
            });
        }

        if (filters.jobTitle) {
          const search = filters.jobTitle.trim().toLowerCase();
          jobs = jobs.filter(job => (job.job_title || '').toLowerCase().includes(search));
        }
        
        if (filters.location) {
          const loc = filters.location.trim().toLowerCase();
          const isBelfastSearch = loc === 'belfast';

          jobs = jobs.filter(job => {
            const jobLocation = (job.location || '').toLowerCase();
            const jobLongLocation = (job.long_location || '').toLowerCase();
            const jobCity = ((job as any).city || '').toLowerCase(); 
            const jobCountry = (job.country || '').toLowerCase();

            const cityRegex = new RegExp(`\\b${loc}\\b`, 'i');
            const commonSeparatorsRegex = new RegExp(`(?:\\s*,\\s*|\\s*\\/\\s*|^)${loc}(?:\\s*,\\s*|\\s*\\/\\s*|$)`, 'i');
            
            if (isBelfastSearch) {
              if ((jobLocation.includes('belfast') && jobLocation.includes('northern ireland')) ||
                  (jobLongLocation.includes('belfast') && jobLongLocation.includes('northern ireland'))) {
                return true;
              }
              return cityRegex.test(jobLocation) || cityRegex.test(jobLongLocation) || cityRegex.test(jobCity);
            }

            return commonSeparatorsRegex.test(jobLocation) ||
                   commonSeparatorsRegex.test(jobLongLocation) ||
                   cityRegex.test(jobCity) || 
                   loc === jobCountry;
          });
        }

        // In-memory filtering for remote/on-site status if filter is provided
        if (filters.remote !== undefined) {
          jobs = jobs.filter(job => job.remote === filters.remote);
        }

        // Normalize remote property for all jobs (ensure boolean or false)
        jobs = jobs.map(job => ({ ...job, remote: !!job.remote }));

        return jobs.length;
      }

      // If no complex filters requiring in-memory processing, use Firestore's native count.
      const countSnapshot = await query.count().get();
      return countSnapshot.data().count || 0;

    } catch (error) {
      logger.error('Error counting jobs with filters:', error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   */
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const doc = await db.getFirestore()
        .collection(this.jobsCollection)
        .doc(jobId)
        .get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as Job;
    } catch (error) {
      console.error('Error getting job by ID:', error);
      throw error;
    }
  }

  /**
   * Update job salary information
   */
  async updateJobSalary(jobId: string, minSalary: number, maxSalary: number): Promise<void> {
    try {
      await db.getFirestore()
        .collection(this.jobsCollection)
        .doc(jobId)
        .update({
          min_annual_salary_usd: minSalary,
          max_annual_salary_usd: maxSalary,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error updating job salary:', error);
      throw error;
    }
  }

  /**
   * Create or update a single job
   */
  async upsertJob(job: Partial<Job>): Promise<void> {
    try {
      if (!job.id) {
        throw new Error('Job ID is required for upsert');
      }

      const jobRef = db.getFirestore().collection(this.jobsCollection).doc(job.id);
      await jobRef.set({
        ...job,
        date_posted: job.date_posted || job.date_posted,
        cachedAt: FieldValue.serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Error upserting job:', error);
      throw new Error(`Failed to upsert job: ${error}`);
    }
  }

  /**
   * Batch create or update multiple jobs
   */
  async batchCreateJobs(jobs: Partial<Job>[]): Promise<void> {
    if (jobs.length === 0) return;

    try {
      // Process jobs in batches to respect Firestore limits
      for (let i = 0; i < jobs.length; i += this.batchSize) {
        const batch = db.getFirestore().batch();
        const batchJobs = jobs.slice(i, i + this.batchSize);

        batchJobs.forEach(job => {
          if (!job.id) {
            console.warn('Skipping job without ID:', job);
            return;
          }

          const jobRef = db.getFirestore().collection(this.jobsCollection).doc(String(job.id));
          batch.set(jobRef, {
            ...job,
            date_posted: job.date_posted || job.date_posted,
            cachedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        });

        await batch.commit();
        console.log(`Batch committed: ${batchJobs.length} jobs`);
      }

    } catch (error) {
      console.error('Error batch creating jobs:', error);
      throw new Error(`Failed to batch create jobs: ${error}`);
    }
  }

  /**
   * Update job enrichment data
   */
  async updateJobEnrichment(jobId: string, enrichmentData: {
    min_annual_salary_usd?: number;
    max_annual_salary_usd?: number;
    country?: string;
    industry?: string;
    tags?: string[];
  }): Promise<void> {
    try {
      const jobRef = db.getFirestore().collection(this.jobsCollection).doc(jobId);
      await jobRef.update({
        ...enrichmentData,
        enrichedAt: FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating job enrichment:', error);
      throw new Error(`Failed to update job enrichment: ${error}`);
    }
  }

  /**
   * Delete old jobs based on date
   */
  async deleteOldJobs(cutoffDate: string): Promise<number> {
    try {
      const snapshot = await db.getFirestore().collection(this.jobsCollection)
        .where('date_posted', '<', cutoffDate)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      // Delete in batches
      let deletedCount = 0;
      for (let i = 0; i < snapshot.docs.length; i += this.batchSize) {
        const batch = db.getFirestore().batch();
        const batchDocs = snapshot.docs.slice(i, i + this.batchSize);
        
        batchDocs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        deletedCount += batchDocs.length;
      }

      console.log(`Deleted ${deletedCount} old jobs`);
      return deletedCount;

    } catch (error) {
      console.error('Error deleting old jobs:', error);
      throw new Error(`Failed to delete old jobs: ${error}`);
    }
  }

  /**
   * Store resume data
   */
  async createResume(resume: Omit<Resume, 'id' | 'uploadedAt'>): Promise<string> {
    try {
      const resumeRef = await db.getFirestore().collection(this.resumesCollection).add({
        ...resume,
        uploadedAt: FieldValue.serverTimestamp()
      });

      return resumeRef.id;
    } catch (error) {
      console.error('Error creating resume:', error);
      throw new Error(`Failed to create resume: ${error}`);
    }
  }

  /**
   * Get resume by filename and user ID
   */
  async getResumeByFilename(filename: string, userId?: string): Promise<Resume | null> {
    try {
      let query = db.getFirestore().collection(this.resumesCollection)
        .where('filename', '==', filename);

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      const snapshot = await query.limit(1).get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Resume;

    } catch (error) {
      console.error('Error getting resume by filename:', error);
      throw new Error(`Failed to fetch resume: ${error}`);
    }
  }

  /**
   * Update resume parsed data
   */
  async updateResumeParsedData(resumeId: string, parsedData: any): Promise<void> {
    try {
      await db.getFirestore().collection(this.resumesCollection).doc(resumeId).update({
        parsedData,
        parsedAt: FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating resume parsed data:', error);
      throw new Error(`Failed to update resume data: ${error}`);
    }
  }

  /**
   * Get user's resumes
   */
  async getUserResumes(userId: string): Promise<Resume[]> {
    try {
      const snapshot = await db.getFirestore().collection(this.resumesCollection)
        .where('userId', '==', userId)
        .orderBy('uploadedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resume));

    } catch (error) {
      console.error('Error getting user resumes:', error);
      throw new Error(`Failed to fetch user resumes: ${error}`);
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalJobs: number;
    recentJobs: number;
    totalResumes: number;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [totalJobsSnapshot, recentJobsSnapshot, totalResumesSnapshot] = await Promise.all([
        db.getFirestore().collection(this.jobsCollection).count().get(),
        db.getFirestore().collection(this.jobsCollection)
          .where('date_posted', '>=', cutoffDate)
          .count().get(),
        db.getFirestore().collection(this.resumesCollection).count().get()
      ]);

      return {
        totalJobs: totalJobsSnapshot.data().count,
        recentJobs: recentJobsSnapshot.data().count,
        totalResumes: totalResumesSnapshot.data().count
      };

    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error(`Failed to get database statistics: ${error}`);
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read a small collection count
      await db.getFirestore().collection(this.jobsCollection).limit(1).get();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const dbService = new DatabaseService();
