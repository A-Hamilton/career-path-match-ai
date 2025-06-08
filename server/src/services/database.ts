import { db } from '../config/database';
import { FieldValue, Query, CollectionReference, DocumentData } from 'firebase-admin/firestore';

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
    offset?: number;
    limit?: number;
  }): Promise<Job[]> {
    try {
      let query: Query<DocumentData> | CollectionReference<DocumentData> = db.getFirestore().collection(this.jobsCollection);

      // Apply filters
      if (filters.cutoffDate) {
        query = query.where('date_posted', '>=', filters.cutoffDate);
      }

      if (filters.salaryMin && !filters.salaryMax) {
        query = query.where('min_annual_salary_usd', '>=', filters.salaryMin);
      } else if (filters.salaryMax && !filters.salaryMin) {
        query = query.where('max_annual_salary_usd', '<=', filters.salaryMax);
      }

      // Add text search optimization for job title
      if (filters.jobTitle) {
        const title = filters.jobTitle.toLowerCase();
        query = query.where('job_title', '>=', title)
                    .where('job_title', '<=', title + '\uf8ff');
      }

      // Order by date for consistent pagination
      query = query.orderBy('date_posted', 'desc');

      // Apply pagination
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

    } catch (error) {
      console.error('Error getting jobs with filters:', error);
      throw new Error(`Failed to fetch filtered jobs: ${error}`);
    }
  }

  /**
   * Get a single job by ID
   */
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const doc = await db.getFirestore().collection(this.jobsCollection).doc(jobId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Job;
    } catch (error) {
      console.error('Error getting job by ID:', error);
      throw new Error(`Failed to fetch job: ${error}`);
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
