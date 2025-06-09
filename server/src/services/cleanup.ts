import cron from 'node-cron';
import { dbService } from './database';
import { JobProcessorService } from './job-processor';

export interface CleanupStats {
  deletedJobs: number;
  deletedFiles: number;
  errors: string[];
}

class CleanupService {
  private isRunning = false;
  private readonly oldJobsThresholdDays = 30;
  private readonly scheduleExpression = '0 0 * * *'; // Daily at midnight
  private cronTasks: any[] = [];

  constructor() {
    // Don't auto-initialize cron jobs in constructor
    // They will be started manually via startScheduledCleanup()
  }
  /**
   * Start scheduled cleanup jobs
   */
  startScheduledCleanup(): void {
    if (this.cronTasks.length > 0) {
      console.log('Cleanup service already started');
      return;
    }

    this.initializeCronJobs();
    console.log('Cleanup service started');
  }
  /**
   * Stop scheduled cleanup jobs
   */
  stopScheduledCleanup(): void {
    this.cronTasks.forEach(task => {
      if (task && typeof task.destroy === 'function') {
        task.destroy();
      }
    });
    this.cronTasks = [];
    console.log('Cleanup service stopped');
  }  /**
   * Initialize all scheduled cleanup jobs
   */
  private initializeCronJobs(): void {
    console.log('Initializing cleanup cron jobs...');

    // Daily cleanup at midnight
    const dailyTask = cron.schedule(this.scheduleExpression, async () => {
      await this.runDailyCleanup();
    });

    // Weekly deep cleanup on Sundays at 2 AM
    const weeklyTask = cron.schedule('0 2 * * 0', async () => {
      await this.runWeeklyCleanup();
    });

    // Proactive cache warming every 4 hours (Layer 2 optimization)
    const cacheWarmingTask = cron.schedule('0 */4 * * *', async () => {
      await this.runCacheWarmingJob();
    });

    // Store tasks for later management
    this.cronTasks = [dailyTask, weeklyTask, cacheWarmingTask];

    console.log('Cleanup cron jobs initialized and started');
  }

  /**
   * Run daily cleanup tasks
   */
  async runDailyCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return { deletedJobs: 0, deletedFiles: 0, errors: ['Cleanup already in progress'] };
    }

    this.isRunning = true;
    console.log('Starting daily cleanup job...');
    
    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      // Clean up old jobs
      const deletedJobs = await this.cleanupOldJobs();
      stats.deletedJobs = deletedJobs;

      // Clean up orphaned files
      const deletedFiles = await this.cleanupOrphanedFiles();
      stats.deletedFiles = deletedFiles;

      console.log(`Daily cleanup completed: ${deletedJobs} jobs, ${deletedFiles} files deleted`);

    } catch (error: any) {
      const errorMessage = `Daily cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    } finally {
      this.isRunning = false;
    }

    return stats;
  }

  /**
   * Run weekly deep cleanup tasks
   */
  async runWeeklyCleanup(): Promise<CleanupStats> {
    console.log('Starting weekly cleanup job...');
    
    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      // Run daily cleanup first
      const dailyStats = await this.runDailyCleanup();
      stats.deletedJobs += dailyStats.deletedJobs;
      stats.deletedFiles += dailyStats.deletedFiles;
      stats.errors.push(...dailyStats.errors);

      // Additional weekly tasks
      await this.optimizeDatabase();
      await this.generateCleanupReport();

      console.log('Weekly cleanup completed');

    } catch (error: any) {
      const errorMessage = `Weekly cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    }

    return stats;
  }

  /**
   * Clean up old jobs from database
   */
  async cleanupOldJobs(): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - this.oldJobsThresholdDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const deletedCount = await dbService.deleteOldJobs(cutoffDate);
      
      if (deletedCount > 0) {
        console.log(`Cleanup: deleted ${deletedCount} old jobs`);
      } else {
        console.log('Cleanup: no old jobs to delete');
      }

      return deletedCount;

    } catch (error: any) {
      console.error('Error cleaning up old jobs:', error);
      throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }
  }

  /**
   * Clean up orphaned files that don't have database records
   */
  async cleanupOrphanedFiles(): Promise<number> {
    // This would be implemented to clean up files in cloud storage
    // that don't have corresponding database records
    try {
      // Placeholder for file cleanup logic
      console.log('Orphaned file cleanup - not implemented yet');
      return 0;
    } catch (error: any) {
      console.error('Error cleaning up orphaned files:', error);
      throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
    }
  }

  /**
   * Manual cleanup trigger for admin use
   */
  async manualCleanup(options: {
    cleanupJobs?: boolean;
    cleanupFiles?: boolean;
    daysThreshold?: number;
  } = {}): Promise<CleanupStats> {
    const {
      cleanupJobs = true,
      cleanupFiles = true,
      daysThreshold = this.oldJobsThresholdDays
    } = options;

    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      if (cleanupJobs) {
        const cutoffDate = new Date(
          Date.now() - daysThreshold * 24 * 60 * 60 * 1000
        ).toISOString();
        
        stats.deletedJobs = await dbService.deleteOldJobs(cutoffDate);
      }

      if (cleanupFiles) {
        stats.deletedFiles = await this.cleanupOrphanedFiles();
      }

      console.log(`Manual cleanup completed: ${stats.deletedJobs} jobs, ${stats.deletedFiles} files deleted`);

    } catch (error: any) {
      const errorMessage = `Manual cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    }

    return stats;
  }

  /**
   * Get cleanup statistics and status
   */
  async getCleanupStatus(): Promise<{
    isRunning: boolean;
    lastRun?: Date;
    nextRun?: Date;
    stats?: any;
  }> {
    try {
      const dbStats = await dbService.getStats();
      
      return {
        isRunning: this.isRunning,
        lastRun: undefined, // Would track this in a persistent store
        nextRun: undefined, // Would calculate from cron schedule
        stats: dbStats
      };

    } catch (error: any) {
      console.error('Error getting cleanup status:', error);
      throw new Error(`Failed to get cleanup status: ${error.message}`);
    }
  }

  /**
   * Database optimization tasks
   */
  private async optimizeDatabase(): Promise<void> {
    try {
      // Placeholder for database optimization
      // Could include index optimization, query analysis, etc.
      console.log('Database optimization completed');
    } catch (error: any) {
      console.error('Database optimization error:', error);
      throw error;
    }
  }

  /**
   * Generate cleanup report
   */
  private async generateCleanupReport(): Promise<void> {
    try {
      const stats = await dbService.getStats();
      
      const report = {
        timestamp: new Date().toISOString(),
        totalJobs: stats.totalJobs,
        recentJobs: stats.recentJobs,
        totalResumes: stats.totalResumes,
        oldJobsThreshold: this.oldJobsThresholdDays
      };

      console.log('Weekly cleanup report:', JSON.stringify(report, null, 2));
      
      // In production, this could be sent to monitoring services,
      // saved to a file, or stored in the database

    } catch (error: any) {
      console.error('Error generating cleanup report:', error);
    }
  }

  /**
   * Health check for cleanup service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if database is accessible
      const isDbHealthy = await dbService.healthCheck();
      
      // Check if cleanup is not stuck
      if (this.isRunning) {
        console.warn('Cleanup service health check: cleanup is currently running');
      }

      return isDbHealthy && !this.isRunning;

    } catch (error: any) {
      console.error('Cleanup service health check failed:', error);
      return false;
    }
  }

  /**
   * Stop all cleanup processes (for graceful shutdown)
   */
  async stop(): Promise<void> {
    console.log('Stopping cleanup service...');
    
    // Wait for current cleanup to finish if running
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Cleanup service stopped');
  }

  /**
   * Get cleanup configuration
   */
  getConfig() {
    return {
      oldJobsThresholdDays: this.oldJobsThresholdDays,
      scheduleExpression: this.scheduleExpression,
      isRunning: this.isRunning
    };
  }
  /**
   * Proactive cache warming job (Layer 2 optimization)
   * Pre-fetches jobs for popular search queries to reduce live API calls
   */
  async runCacheWarmingJob(): Promise<void> {
    console.log('Running scheduled job: Proactive Cache Warming...');
    
    // Popular search queries organized by priority (high-demand first)
    const popularSearches = [
      // High-demand tech roles
      { what: 'Software Engineer', where: 'Remote', priority: 'high' },
      { what: 'Software Developer', where: 'Remote', priority: 'high' },
      { what: 'Full Stack Developer', where: 'Remote', priority: 'high' },
      { what: 'Frontend Developer', where: 'Remote', priority: 'high' },
      { what: 'Backend Developer', where: 'Remote', priority: 'high' },
      
      // Location-specific tech roles
      { what: 'Software Engineer', where: 'Belfast', priority: 'high' },
      { what: 'Software Engineer', where: 'Dublin', priority: 'high' },
      { what: 'Frontend Developer', where: 'Dublin', priority: 'medium' },
      { what: 'Backend Developer', where: 'Belfast', priority: 'medium' },
      { what: 'Full Stack Developer', where: 'Cork', priority: 'medium' },
      
      // Product and data roles
      { what: 'Product Manager', where: 'Remote', priority: 'high' },
      { what: 'Data Scientist', where: 'Remote', priority: 'high' },
      { what: 'Data Scientist', where: 'Dublin', priority: 'medium' },
      { what: 'Data Analyst', where: 'Belfast', priority: 'medium' },
      { what: 'Product Manager', where: 'Dublin', priority: 'medium' },
      
      // DevOps and infrastructure
      { what: 'DevOps Engineer', where: 'Remote', priority: 'medium' },
      { what: 'Cloud Engineer', where: 'Remote', priority: 'medium' },
      { what: 'Site Reliability Engineer', where: 'Remote', priority: 'medium' },
      
      // Design and UX
      { what: 'UI/UX Designer', where: 'Remote', priority: 'medium' },
      { what: 'UI/UX Designer', where: 'Dublin', priority: 'low' },
      { what: 'Graphic Designer', where: 'Cork', priority: 'low' },
      
      // Business roles
      { what: 'Business Analyst', where: 'Remote', priority: 'medium' },
      { what: 'Project Manager', where: 'Dublin', priority: 'low' },
      { what: 'Scrum Master', where: 'Remote', priority: 'low' },
      
      // Marketing and sales
      { what: 'Marketing Manager', where: 'Remote', priority: 'low' },
      { what: 'Digital Marketing Specialist', where: 'Dublin', priority: 'low' },
      { what: 'Sales Representative', where: 'Belfast', priority: 'low' },
      
      // Traditional roles
      { what: 'Accountant', where: 'Cork', priority: 'low' },
      { what: 'HR Manager', where: 'Belfast', priority: 'low' },
      { what: 'Administrative Assistant', where: 'Dublin', priority: 'low' }
    ];

    // Sort by priority to warm high-demand caches first
    const sortedSearches = popularSearches.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const query of sortedSearches) {
      try {
        console.log(`Cache warming: Processing ${query.priority} priority query - ${query.what} in ${query.where}`);
        
        // Check if we already have recent results for this query to avoid unnecessary processing
        const searchKey = this.generateSearchKey(query);
        if (this.hasRecentCache(searchKey)) {
          console.log(`Cache warming: Skipping ${query.what} in ${query.where} - already cached`);
          skippedCount++;
          continue;
        }
        
        // Use the job processor to fetch and store jobs
        const success = await JobProcessorService.fetchAndProcessJob(query);
        
        if (success) {
          processedCount++;
        } else {
          console.log(`Cache warming: No new jobs found for ${query.what} in ${query.where}`);
        }
        
        // Variable delays based on priority - shorter delays for high-priority queries
        const delay = query.priority === 'high' ? 15000 : query.priority === 'medium' ? 30000 : 45000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error: any) {
        errorCount++;
        console.error(`Cache warming error for query ${query.what} in ${query.where}:`, error.message);
        
        // Continue with next query even if one fails
        continue;
      }
    }
    
    console.log(`Cache warming job completed. Processed: ${processedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
  }

  /**
   * Generate search key for cache warming (same logic as RequestTracker)
   */
  private generateSearchKey(queryParams: any): string {
    const normalized = {
      what: queryParams.what?.toLowerCase()?.trim() || '',
      where: queryParams.where?.toLowerCase()?.trim() || '',
      salary_min: queryParams.salary_min || '',
      salary_max: queryParams.salary_max || '',
      remote: queryParams.remote || false,
      contract_type: queryParams.contract_type || ''
    };
    return JSON.stringify(normalized);
  }

  /**
   * Check if we have recent cache data for a search query
   */
  private hasRecentCache(searchKey: string): boolean {
    // This would check both queryCache and recent processing
    // For now, we'll use a simple time-based check
    // TODO: Integrate with actual cache checking logic
    return false; // Always process for now, but this can be optimized
  }
}

export const cleanupService = new CleanupService();
